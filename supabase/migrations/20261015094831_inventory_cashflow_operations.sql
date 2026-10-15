
alter table public.orders
  add column if not exists inventory_status text not null default 'legacy'
    check (inventory_status in ('none','reserved','committed','released','legacy')),
  add column if not exists inventory_reserved_at timestamptz,
  add column if not exists inventory_expires_at timestamptz,
  add column if not exists square_refunded_amount numeric(12,2) not null default 0 check (square_refunded_amount >= 0),
  add column if not exists payment_method text not null default 'square',
  add column if not exists inventory_issue text;

update public.orders set inventory_status = case
  when payment_status = 'paid' then 'legacy'
  else 'legacy'
end
where inventory_status = 'legacy';

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  movement_type text not null check (movement_type in ('opening_balance','checkout_reserved','reservation_released','sale_committed','manual_adjustment')),
  quantity_delta integer not null check (quantity_delta <> 0),
  stock_before integer not null check (stock_before >= 0),
  stock_after integer not null check (stock_after >= 0),
  reason text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  idempotency_key text unique
);
create index if not exists inventory_movements_product_created_idx
  on public.inventory_movements(product_id, created_at desc);
create index if not exists inventory_movements_order_idx
  on public.inventory_movements(order_id) where order_id is not null;

create table if not exists public.cashflow_entries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete restrict,
  order_item_id uuid references public.order_items(id) on delete restrict,
  entry_type text not null check (entry_type in ('customer_payment','customer_refund','square_processing_fee','seller_payout','fulfillment_payment','seller_refund_recovery','manual_adjustment')),
  direction text not null check (direction in ('inflow','outflow')),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  payment_method text not null check (payment_method in ('square','cash','bank_transfer','other')),
  status text not null default 'posted' check (status in ('posted','voided')),
  external_reference text,
  idempotency_key text not null unique,
  description text not null,
  recorded_by uuid,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists cashflow_entries_occurred_idx
  on public.cashflow_entries(occurred_at desc);
create index if not exists cashflow_entries_order_idx
  on public.cashflow_entries(order_id) where order_id is not null;
create index if not exists cashflow_entries_type_status_idx
  on public.cashflow_entries(entry_type, status, currency);

create table if not exists public.square_webhook_events (
  event_id text primary key,
  event_type text not null,
  resource_id text,
  received_at timestamptz not null default now(),
  processed_at timestamptz not null default now()
);

alter table public.inventory_movements enable row level security;
alter table public.cashflow_entries enable row level security;
alter table public.square_webhook_events enable row level security;

drop policy if exists "Admin can read inventory movements" on public.inventory_movements;
create policy "Admin can read inventory movements" on public.inventory_movements
  for select to authenticated using ((select private.is_admin()));
drop policy if exists "Admin can read cashflow entries" on public.cashflow_entries;
create policy "Admin can read cashflow entries" on public.cashflow_entries
  for select to authenticated using ((select private.is_admin()));

revoke all on public.inventory_movements from anon, authenticated;
grant select on public.inventory_movements to authenticated;
grant all on public.inventory_movements to service_role;
revoke all on public.cashflow_entries from anon, authenticated;
grant select on public.cashflow_entries to authenticated;
grant all on public.cashflow_entries to service_role;
revoke all on public.square_webhook_events from anon, authenticated;
grant all on public.square_webhook_events to service_role;

create or replace function private.log_product_stock_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before integer;
  v_after integer;
  v_type text;
  v_order_id uuid;
  v_reason text;
begin
  if tg_op = 'INSERT' then
    v_before := 0;
    v_after := new.stock_quantity;
    v_type := 'opening_balance';
    v_reason := 'Opening stock entered during product setup';
  else
    v_before := old.stock_quantity;
    v_after := new.stock_quantity;
    if v_before is not distinct from v_after then return new; end if;
    v_type := coalesce(nullif(current_setting('app.inventory_movement_type', true), ''), 'manual_adjustment');
    v_order_id := nullif(current_setting('app.inventory_order_id', true), '')::uuid;
    v_reason := coalesce(nullif(current_setting('app.inventory_reason', true), ''), 'Stock quantity changed');
  end if;

  insert into public.inventory_movements(
    product_id, order_id, movement_type, quantity_delta, stock_before, stock_after,
    reason, created_by, idempotency_key
  ) values (
    new.id, v_order_id, v_type, v_after - v_before, v_before, v_after,
    v_reason, auth.uid(),
    case when v_order_id is not null and v_type in ('checkout_reserved','reservation_released','sale_committed')
      then v_type || ':' || v_order_id::text || ':' || new.id::text
      else null end
  )
  on conflict (idempotency_key) do nothing;

  return new;
end;
$$;

drop trigger if exists products_log_stock_insert on public.products;
create trigger products_log_stock_insert
  after insert on public.products
  for each row execute function private.log_product_stock_change();
drop trigger if exists products_log_stock_update on public.products;
create trigger products_log_stock_update
  after update of stock_quantity on public.products
  for each row execute function private.log_product_stock_change();

insert into public.inventory_movements(
  product_id, movement_type, quantity_delta, stock_before, stock_after, reason,
  idempotency_key
)
select p.id, 'opening_balance', p.stock_quantity, 0, p.stock_quantity,
       'Opening stock at inventory ledger launch', 'opening:' || p.id::text
from public.products p
where p.stock_quantity > 0
  and not exists (select 1 from public.inventory_movements m where m.product_id=p.id);

create or replace function public.admin_adjust_inventory(
  target_product_id uuid,
  quantity_change integer,
  adjustment_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_quantity integer;
  next_quantity integer;
begin
  if not (select private.is_admin()) then
    raise exception 'Admin access required' using errcode='42501';
  end if;
  if quantity_change = 0 or nullif(btrim(adjustment_reason), '') is null then
    raise exception 'Enter a non-zero stock adjustment and a reason';
  end if;

  select stock_quantity into current_quantity
  from public.products where id=target_product_id for update;
  if not found then raise exception 'Product not found'; end if;
  next_quantity := current_quantity + quantity_change;
  if next_quantity < 0 then raise exception 'Stock cannot be reduced below zero'; end if;

  perform set_config('app.inventory_movement_type','manual_adjustment',true);
  perform set_config('app.inventory_reason',left(btrim(adjustment_reason),240),true);
  update public.products
  set stock_quantity=next_quantity,
      status=case
        when status in ('draft','archived') then status
        when next_quantity > 0 then 'active'::public.product_status
        else 'sold_out'::public.product_status
      end
  where id=target_product_id;
  return next_quantity;
end;
$$;
revoke all on function public.admin_adjust_inventory(uuid, integer, text) from public, anon;
grant execute on function public.admin_adjust_inventory(uuid, integer, text) to authenticated;

create or replace function private.release_order_inventory(target_order_id uuid, release_reason text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.orders%rowtype;
  item record;
begin
  select * into order_row from public.orders where id=target_order_id for update;
  if not found or order_row.inventory_status <> 'reserved' then return false; end if;

  perform set_config('app.inventory_movement_type','reservation_released',true);
  perform set_config('app.inventory_order_id',target_order_id::text,true);
  perform set_config('app.inventory_reason',left(coalesce(release_reason,'Reservation released'),240),true);

  for item in
    select product_id, sum(quantity)::integer quantity
    from public.order_items
    where order_id=target_order_id and product_id is not null
    group by product_id order by product_id
  loop
    update public.products
    set stock_quantity=stock_quantity+item.quantity,
        status=case
          when status in ('draft','archived') then status
          else 'active'::public.product_status
        end
    where id=item.product_id;
  end loop;

  update public.orders
  set inventory_status='released', inventory_expires_at=null,
      updated_at=now()
  where id=target_order_id;
  return true;
end;
$$;

create or replace function private.release_inventory_when_order_cancelled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.journey_status='cancelled'
     and old.journey_status is distinct from new.journey_status
     and new.inventory_status='reserved' then
    perform private.release_order_inventory(new.id,'Order cancelled before payment; reserved stock released');
  end if;
  return new;
end;
$$;
drop trigger if exists orders_release_reserved_inventory on public.orders;
create trigger orders_release_reserved_inventory
  after update of journey_status on public.orders
  for each row execute function private.release_inventory_when_order_cancelled();

create or replace function public.release_expired_checkout_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  released_count integer := 0;
begin
  for r in
    select id, journey_status
    from public.orders
    where inventory_status='reserved'
      and inventory_expires_at <= now()
      and payment_status='unpaid'
    order by inventory_expires_at
    for update skip locked
  loop
    update public.orders
    set status='cancelled'::public.order_status,
        journey_status='cancelled'::public.order_journey_status,
        updated_at=now(),
        internal_notes=concat_ws(E'\n',nullif(internal_notes,''),'Checkout expired without payment; inventory reservation released.')
    where id=r.id;
    insert into public.order_journey_events(order_id,status,changed_by,changed_by_role,note)
    values(r.id,'cancelled'::public.order_journey_status,null,'system','Checkout expired without payment; reserved stock was released.');
    released_count := released_count + 1;
  end loop;
  return released_count;
end;
$$;
revoke all on function public.release_expired_checkout_reservations() from public, anon, authenticated;
grant execute on function public.release_expired_checkout_reservations() to service_role;

create or replace function public.cancel_unpaid_checkout_reservation(target_order_id uuid, cancel_reason text default 'Square checkout could not be created')
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare changed integer;
begin
  update public.orders
  set status='cancelled'::public.order_status,
      journey_status='cancelled'::public.order_journey_status,
      updated_at=now(),
      internal_notes=concat_ws(E'\n',nullif(internal_notes,''),left(cancel_reason,240))
  where id=target_order_id and payment_status='unpaid' and inventory_status='reserved';
  get diagnostics changed = row_count;
  if changed > 0 then
    insert into public.order_journey_events(order_id,status,changed_by,changed_by_role,note)
    values(target_order_id,'cancelled'::public.order_journey_status,null,'system',left(cancel_reason,240));
  end if;
  return changed > 0;
end;
$$;
revoke all on function public.cancel_unpaid_checkout_reservation(uuid,text) from public, anon, authenticated;
grant execute on function public.cancel_unpaid_checkout_reservation(uuid,text) to service_role;

create or replace function public.create_checkout_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_order_number bigint;
  v_subtotal numeric(12,2);
  v_fx_aud numeric(12,6);
  v_fx_buyer numeric(12,6);
  v_payment_aud numeric(12,2);
  v_buyer_currency text;
  v_item record;
  v_product public.products%rowtype;
  v_quantity integer;
  v_size text;
  v_color text;
begin
  if coalesce(jsonb_typeof(payload->'items'),'') <> 'array'
     or jsonb_array_length(payload->'items') < 1
     or jsonb_array_length(payload->'items') > 20 then
    raise exception 'Invalid cart';
  end if;
  if nullif(btrim(payload->>'customer_name'),'') is null
     or nullif(btrim(payload->>'customer_email'),'') is null
     or nullif(btrim(payload->>'customer_phone'),'') is null
     or nullif(btrim(payload->>'delivery_address'),'') is null then
    raise exception 'Missing customer details';
  end if;

  v_fx_aud := nullif(payload->>'fx_rate_usd_to_aud','')::numeric;
  v_fx_buyer := coalesce(nullif(payload->>'fx_rate_usd_to_buyer','')::numeric,1);
  v_buyer_currency := coalesce(nullif(payload->>'buyer_currency',''),'USD');
  if v_fx_aud is null or v_fx_aud <= 0 or v_fx_buyer <= 0
     or v_buyer_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid exchange rate';
  end if;

  select round(sum(p.price * i.quantity)::numeric,2)
  into v_subtotal
  from jsonb_to_recordset(payload->'items') as i(product_id uuid, quantity integer)
  join public.products p on p.id=i.product_id;
  if v_subtotal is null or v_subtotal <= 0 or v_subtotal > 5000 then
    raise exception 'Invalid checkout total';
  end if;
  v_payment_aud := round(v_subtotal * v_fx_aud,2);

  insert into public.orders(
    customer_name,customer_email,customer_phone,delivery_address,
    subtotal,delivery_fee,status,payment_status,sales_channel,
    buyer_currency,fx_rate_usd_to_buyer,fx_rate_usd_to_aud,payment_amount_aud,
    payment_method,inventory_status,inventory_reserved_at,inventory_expires_at
  ) values (
    btrim(payload->>'customer_name'),lower(btrim(payload->>'customer_email')),
    btrim(payload->>'customer_phone'),btrim(payload->>'delivery_address'),
    v_subtotal,0,'new'::public.order_status,'unpaid'::public.payment_status,'website',
    v_buyer_currency,v_fx_buyer,v_fx_aud,v_payment_aud,
    'square','reserved',now(),now()+interval '30 minutes'
  ) returning id,order_number into v_order_id,v_order_number;

  perform set_config('app.inventory_movement_type','checkout_reserved',true);
  perform set_config('app.inventory_order_id',v_order_id::text,true);
  perform set_config('app.inventory_reason','Stock held for pending Square checkout',true);

  for v_item in
    select i.product_id, sum(i.quantity)::integer quantity
    from jsonb_to_recordset(payload->'items') as i(product_id uuid, quantity integer)
    group by i.product_id order by i.product_id
  loop
    if v_item.product_id is null or v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 10 then
      raise exception 'Invalid item quantity';
    end if;
    select * into v_product
    from public.products where id=v_item.product_id for update;
    if not found or v_product.status in ('draft','archived') then
      raise exception 'PRODUCT_UNAVAILABLE';
    end if;
    if v_product.stock_quantity < v_item.quantity then
      raise exception 'STOCK_UNAVAILABLE: % has only % available', v_product.name, v_product.stock_quantity;
    end if;
    update public.products
    set stock_quantity=stock_quantity-v_item.quantity,
        status=case
          when stock_quantity-v_item.quantity > 0 then 'active'::public.product_status
          else 'sold_out'::public.product_status
        end
    where id=v_item.product_id;
  end loop;

  for v_item in
    select i.product_id,i.quantity,i.selected_size,i.selected_color
    from jsonb_to_recordset(payload->'items') as i(
      product_id uuid, quantity integer, selected_size text, selected_color text
    )
  loop
    if v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 10 then
      raise exception 'Invalid item quantity';
    end if;
    select * into v_product from public.products where id=v_item.product_id;
    v_size := nullif(btrim(v_item.selected_size),'');
    v_color := nullif(btrim(v_item.selected_color),'');
    if v_size is not null and not (v_size=any(v_product.sizes)) then
      raise exception 'SIZE_UNAVAILABLE';
    end if;
    if v_size is null and cardinality(v_product.sizes)>0 then
      raise exception 'SIZE_REQUIRED';
    end if;
    insert into public.order_items(order_id,product_id,quantity,selected_size,selected_color)
    values(v_order_id,v_item.product_id,v_item.quantity,v_size,v_color);
  end loop;

  insert into public.order_journey_events(order_id,status,changed_by,changed_by_role,note)
  values(v_order_id,'order_placed'::public.order_journey_status,null,'system','Customer started Square checkout; stock reserved for 30 minutes.');

  return jsonb_build_object(
    'id',v_order_id,'order_number',v_order_number,'subtotal',v_subtotal,
    'payment_amount_aud',v_payment_aud
  );
end;
$$;
revoke all on function public.create_checkout_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_checkout_order(jsonb) to service_role;

create or replace function public.record_order_cashflow(
  target_order_id uuid,
  target_order_item_id uuid,
  target_entry_type text,
  target_direction text,
  target_amount numeric,
  target_currency text,
  target_method text,
  target_key text,
  target_description text,
  target_external_reference text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_amount is null or target_amount <= 0 then return; end if;
  insert into public.cashflow_entries(
    order_id,order_item_id,entry_type,direction,amount,currency,payment_method,
    idempotency_key,description,external_reference,recorded_by
  ) values (
    target_order_id,target_order_item_id,target_entry_type,target_direction,
    round(target_amount,2),upper(target_currency),target_method,target_key,
    left(target_description,240),target_external_reference,auth.uid()
  ) on conflict (idempotency_key) do nothing;
end;
$$;
revoke all on function public.record_order_cashflow(uuid,uuid,text,text,numeric,text,text,text,text,text) from public, anon, authenticated;

create or replace function private.log_order_item_cashflow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.orders%rowtype;
  cash_amount numeric;
begin
  select * into order_row from public.orders where id=new.order_id;
  if not found then return new; end if;

  if new.seller_id is not null
     and new.payout_status='paid'
     and old.payout_status is distinct from new.payout_status then
    if order_row.payment_status <> 'paid'::public.payment_status
       or order_row.journey_status='cancelled'::public.order_journey_status then
      raise exception 'Seller payout can be recorded only for an active, paid order';
    end if;
    perform public.record_order_cashflow(
      new.order_id,new.id,'seller_payout','outflow',new.seller_payout_total,
      'USD','bank_transfer','seller-payout:'||new.id::text,
      'Seller payout recorded as sent',null
    );
  end if;

  if new.fulfillment_payment_status='paid'
     and old.fulfillment_payment_status is distinct from new.fulfillment_payment_status then
    if order_row.payment_status <> 'paid'::public.payment_status
       or order_row.journey_status='cancelled'::public.order_journey_status then
      raise exception 'Fulfillment payment can be recorded only for an active, paid order';
    end if;
    cash_amount := coalesce(new.fulfillment_service_fee,0)+coalesce(new.gpo_fee,0);
    perform public.record_order_cashflow(
      new.order_id,new.id,'fulfillment_payment','outflow',cash_amount,
      'USD','bank_transfer','fulfillment-payment:'||new.id::text,
      'Fulfillment payment recorded as sent',null
    );
  end if;
  return new;
end;
$$;
drop trigger if exists order_items_record_cashflow on public.order_items;
create trigger order_items_record_cashflow
  after update of payout_status,fulfillment_payment_status on public.order_items
  for each row execute function private.log_order_item_cashflow();

create or replace function private.sync_payables_after_customer_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.payment_status='paid'::public.payment_status
     and old.payment_status is distinct from new.payment_status then
    update public.order_items
    set payout_status='due'::public.payout_status
    where order_id=new.id and seller_id is not null and payout_status='not_due'::public.payout_status;
  elsif new.payment_status in ('refunded'::public.payment_status,'partially_refunded'::public.payment_status)
     and old.payment_status is distinct from new.payment_status then
    update public.order_items
    set payout_status='held'::public.payout_status
    where order_id=new.id and seller_id is not null and payout_status in ('due'::public.payout_status,'scheduled'::public.payout_status);
  end if;
  return new;
end;
$$;
drop trigger if exists orders_sync_payables_after_payment on public.orders;
create trigger orders_sync_payables_after_payment
  after update of payment_status on public.orders
  for each row execute function private.sync_payables_after_customer_payment();

create or replace function private.log_seller_refund_recovery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.refund_status='completed' and old.refund_status is distinct from new.refund_status
     and coalesce(new.seller_refund_recovery_amount,0)>0 then
    perform public.record_order_cashflow(
      new.id,null,'seller_refund_recovery','inflow',new.seller_refund_recovery_amount,
      'USD','bank_transfer','seller-refund-recovery:'||new.id::text,
      'Seller refund recovery confirmed as received',null
    );
  end if;
  return new;
end;
$$;
drop trigger if exists orders_log_seller_refund_recovery on public.orders;
create trigger orders_log_seller_refund_recovery
  after update of refund_status on public.orders
  for each row execute function private.log_seller_refund_recovery();

create or replace function public.process_square_webhook_event(square_event jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_id text := nullif(square_event->>'event_id','');
  event_type text := coalesce(square_event->>'type','');
  payment jsonb;
  refund jsonb;
  payment_id text;
  square_order_id text;
  resource_id text;
  payment_state text;
  payment_amount numeric;
  payment_currency text;
  fee_amount numeric;
  refund_amount numeric;
  refund_currency text;
  order_row public.orders%rowtype;
  item jsonb;
  total_refunded numeric;
  inserted_id uuid;
  product_row record;
begin
  if event_id is null then raise exception 'Square webhook event has no event_id'; end if;
  if event_type in ('payment.created','payment.updated') then
    payment := square_event #> '{data,object,payment}';
    payment_id := payment->>'id';
    square_order_id := payment->>'order_id';
    resource_id := payment_id;
  elsif event_type in ('refund.created','refund.updated') then
    refund := square_event #> '{data,object,refund}';
    payment_id := refund->>'payment_id';
    resource_id := refund->>'id';
  else
    return true;
  end if;

  insert into public.square_webhook_events(event_id,event_type,resource_id)
  values(event_id,event_type,resource_id)
  on conflict (event_id) do nothing;
  if not found then return true; end if;

  if event_type in ('payment.created','payment.updated') then
    if square_order_id is null then return true; end if;
    select * into order_row from public.orders where square_order_id=square_order_id for update;
    if not found then return true; end if;
    payment_state := payment->>'status';
    if payment_id is not null then
      update public.orders set square_payment_id=payment_id,updated_at=now() where id=order_row.id;
    end if;

    if payment_state='COMPLETED' then
      payment_amount := coalesce((payment #>> '{amount_money,amount}')::numeric/100,null);
      payment_currency := payment #>> '{amount_money,currency}';
      if payment_amount is null or payment_currency <> 'AUD'
         or payment_amount <> order_row.payment_amount_aud then
        raise exception 'Square payment does not match expected order amount and currency';
      end if;

      update public.orders
      set payment_status='paid'::public.payment_status,
          inventory_status=case when inventory_status='reserved' then 'committed' else inventory_status end,
          inventory_issue=case when inventory_status='released' then 'Stock hold expired before Square payment completed; verify stock or refund.' else inventory_issue end,
          updated_at=now()
      where id=order_row.id;

      perform public.record_order_cashflow(
        order_row.id,null,'customer_payment','inflow',payment_amount,
        'AUD','square','square-payment:'||payment_id,
        'Square customer payment',payment_id
      );

      fee_amount := 0;
      for item in select value from jsonb_array_elements(coalesce(payment->'processing_fee','[]'::jsonb))
      loop
        fee_amount := fee_amount + coalesce((item #>> '{amount_money,amount}')::numeric/100,0);
      end loop;
      if fee_amount > 0 then
        perform public.record_order_cashflow(
          order_row.id,null,'square_processing_fee','outflow',fee_amount,
          'AUD','square','square-fee:'||payment_id,
          'Square processing fee',payment_id
        );
      end if;

      if order_row.inventory_status='released' then
        insert into public.order_journey_events(order_id,status,changed_by,changed_by_role,note)
        values(order_row.id,order_row.journey_status,null,'system','Payment completed after the inventory hold expired. Confirm stock is still available or issue a Square refund.');
      end if;

    elsif payment_state in ('FAILED','CANCELED') and order_row.payment_status='unpaid' then
      update public.orders
      set payment_status='unpaid'::public.payment_status,
          status='cancelled'::public.order_status,
          journey_status='cancelled'::public.order_journey_status,
          updated_at=now(),
          internal_notes=concat_ws(E'\n',nullif(internal_notes,''),'Square payment failed or was cancelled; stock reservation released.')
      where id=order_row.id;
      insert into public.order_journey_events(order_id,status,changed_by,changed_by_role,note)
      values(order_row.id,'cancelled'::public.order_journey_status,null,'system','Square payment failed or was cancelled; stock reservation released.');
    end if;

  elsif event_type in ('refund.created','refund.updated') then
    if refund->>'status' <> 'COMPLETED' or payment_id is null then return true; end if;
    select * into order_row from public.orders where square_payment_id=payment_id for update;
    if not found then return true; end if;
    refund_amount := coalesce((refund #>> '{amount_money,amount}')::numeric/100,null);
    refund_currency := refund #>> '{amount_money,currency}';
    if refund_amount is null or refund_amount <= 0 or refund_currency <> 'AUD' then
      raise exception 'Square refund has an invalid amount or currency';
    end if;

    perform public.record_order_cashflow(
      order_row.id,null,'customer_refund','outflow',refund_amount,
      'AUD','square','square-refund:'||coalesce(refund->>'id',event_id),
      'Square customer refund',refund->>'id'
    );
    select coalesce(sum(amount),0) into total_refunded
    from public.cashflow_entries
    where order_id=order_row.id and entry_type='customer_refund' and status='posted';
    if total_refunded > order_row.payment_amount_aud then
      raise exception 'Square refunds exceed captured customer payments';
    end if;
    update public.orders
    set square_refunded_amount=total_refunded,
        payment_status=case when total_refunded >= payment_amount_aud then 'refunded'::public.payment_status else 'partially_refunded'::public.payment_status end,
        updated_at=now()
    where id=order_row.id;
  end if;

  return true;
end;
$$;
revoke all on function public.process_square_webhook_event(jsonb) from public, anon, authenticated;
grant execute on function public.process_square_webhook_event(jsonb) to service_role;

create or replace function public.admin_create_manual_order(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_order_id uuid;
  p public.products%rowtype;
  q integer;
  customer_total numeric;
  payment_method_value text := coalesce(nullif(payload->>'payment_method',''),'cash');
begin
  if not (select private.is_admin()) then
    raise exception 'Admin access required' using errcode='42501';
  end if;
  if payment_method_value not in ('cash','bank_transfer','other') then
    raise exception 'Select cash, bank transfer, or other for a manually recorded sale';
  end if;

  q:=greatest(coalesce((payload->>'quantity')::integer,1),1);
  select * into p from public.products where id=(payload->>'product_id')::uuid for update;
  if not found then raise exception 'Product not found'; end if;
  if p.status in ('archived','draft') or p.stock_quantity < q then
    raise exception 'STOCK_UNAVAILABLE: % has only % available',p.name,p.stock_quantity;
  end if;
  customer_total:=p.price*q;

  insert into public.orders(
    customer_name,customer_email,customer_phone,delivery_address,subtotal,delivery_fee,
    payment_status,payment_method,sales_channel,inventory_status
  ) values (
    payload->>'customer_name',nullif(payload->>'customer_email',''),
    nullif(payload->>'customer_phone',''),nullif(payload->>'delivery_address',''),
    customer_total,0,'paid'::public.payment_status,payment_method_value,
    'admin_manual','committed'
  ) returning id into new_order_id;

  perform set_config('app.inventory_movement_type','sale_committed',true);
  perform set_config('app.inventory_order_id',new_order_id::text,true);
  perform set_config('app.inventory_reason','Manual customer sale recorded by admin',true);
  update public.products
  set stock_quantity=stock_quantity-q,
      status=case when stock_quantity-q>0 then 'active'::public.product_status else 'sold_out'::public.product_status end
  where id=p.id;

  insert into public.order_items(order_id,product_id,quantity,selected_size,selected_color)
  values(new_order_id,p.id,q,nullif(payload->>'selected_size',''),nullif(payload->>'selected_color',''));
  insert into public.order_journey_events(order_id,status,changed_by,changed_by_role,note)
  values(new_order_id,'order_placed',(select auth.uid()),'admin','Manual sale recorded; payment marked received.');

  perform public.record_order_cashflow(
    new_order_id,null,'customer_payment','inflow',customer_total,'USD',
    payment_method_value,'manual-sale:'||new_order_id::text,
    'Manual customer payment recorded',null
  );
  return new_order_id;
end;
$$;

create or replace function public.admin_complete_order_refund(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare recovery numeric;
begin
  if not (select private.is_admin()) then raise exception 'Admin access required' using errcode='42501'; end if;
  update public.orders set refund_status='completed',refund_completed_at=now(),updated_at=now()
  where id=target_order_id and refund_status='sent_by_seller';
  if not found then raise exception 'Seller refund must be marked sent first'; end if;
end;
$$;

do $$
begin
  create extension if not exists pg_cron;
  if exists(select 1 from pg_namespace where nspname='cron') then
    perform cron.unschedule(jobid) from cron.job where jobname='overstock-release-expired-inventory';
    perform cron.schedule('overstock-release-expired-inventory','*/5 * * * *','select public.release_expired_checkout_reservations();');
  end if;
exception when insufficient_privilege or undefined_table or undefined_function then
  raise notice 'Supabase Cron was not configured automatically; call public.release_expired_checkout_reservations() from a scheduled job.';
end
$$;
