
CREATE OR REPLACE FUNCTION public.admin_update_product(target_product_id uuid, payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  seller_id_value uuid;
  ownership_value public.product_ownership;
  cost numeric;
  inbound numeric;
  service numeric;
  gpo_rate numeric;
  weight integer;
  target numeric;
  seller_pct numeric;
  price_value numeric;
  stock_count integer;
  current_stock integer;
  requested_status public.product_status;
  listing_status public.product_status;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING errcode='42501';
  END IF;

  seller_id_value := nullif(payload->>'seller_id','')::uuid;
  ownership_value := (payload->>'ownership')::public.product_ownership;
  cost := coalesce((payload->>'cost_of_goods')::numeric,0);
  inbound := coalesce((payload->>'inbound_delivery_fee')::numeric,0);
  service := coalesce((payload->>'fulfillment_service_fee')::numeric,5);
  gpo_rate := coalesce((payload->>'gpo_fee_per_500g')::numeric,2.5);
  weight := coalesce((payload->>'weight_grams')::integer,500);
  target := coalesce((payload->>'overstock_profit_target')::numeric,0);
  SELECT stock_quantity INTO current_stock FROM public.products WHERE id=target_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  stock_count := coalesce(nullif(payload->>'stock_quantity','')::integer,current_stock);
  requested_status := coalesce(nullif(payload->>'status','')::public.product_status,'active'::public.product_status);

  IF stock_count < 0 THEN
    RAISE EXCEPTION 'Stock quantity cannot be negative';
  END IF;

  listing_status := CASE
    WHEN requested_status='archived'::public.product_status THEN 'archived'::public.product_status
    WHEN stock_count > 0 THEN 'active'::public.product_status
    ELSE 'sold_out'::public.product_status
  END;

  seller_pct := CASE
    WHEN ownership_value='seller'
    THEN coalesce((SELECT commission_percent FROM public.sellers WHERE id=seller_id_value),0)
    ELSE 0
  END;
  price_value := round(cost+CASE WHEN ownership_value='seller' THEN inbound ELSE 0 END+service+ceil(weight::numeric/500)*gpo_rate+CASE WHEN seller_pct>0 THEN target/(1-seller_pct/100) ELSE target END,2);

  UPDATE public.products
  SET name=payload->>'name',
      description=coalesce(payload->>'description',''),
      audience=payload->>'audience',
      category=payload->>'category',
      brand=coalesce(payload->>'brand',''),
      color=coalesce(payload->>'color',''),
      condition=coalesce(payload->>'condition',''),
      sizes=array(SELECT jsonb_array_elements_text(payload->'sizes')),
      price=price_value,
      stock_quantity=stock_count,
      ownership=ownership_value,
      seller_id=seller_id_value,
      status=listing_status,
      cost_of_goods=cost,
      inbound_delivery_fee=inbound,
      fulfillment_service_fee=service,
      gpo_fee_per_500g=gpo_rate,
      weight_grams=weight,
      overstock_profit_target=target
  WHERE id=target_product_id;
END;
$function$;


create or replace function private.enforce_seller_payout_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  customer_payment public.payment_status;
  order_status public.order_status;
begin
  if new.seller_id is null then
    if new.payout_status <> 'not_due'::public.payout_status then
      raise exception 'OVERSTOCK inventory has no seller payout';
    end if;
    return new;
  end if;

  if tg_op='UPDATE' and old.payout_status='paid'::public.payout_status
     and new.payout_status<>'paid'::public.payout_status then
    raise exception 'A completed seller payout cannot be reversed; record an accounting adjustment';
  end if;

  select payment_status,status into customer_payment,order_status
  from public.orders where id=new.order_id;
  if not found then raise exception 'Seller payout requires a valid order'; end if;
  if new.payout_status in ('due'::public.payout_status,'scheduled'::public.payout_status,'paid'::public.payout_status)
     and (customer_payment is distinct from 'paid'::public.payment_status or order_status='cancelled'::public.order_status) then
    raise exception 'Seller payout requires a completed customer payment and an active order';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_fulfillment_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  order_payment public.payment_status;
  order_status public.order_status;
begin
  if tg_op='UPDATE' and old.fulfillment_payment_status='paid'
     and new.fulfillment_payment_status<>'paid' then
    raise exception 'A completed fulfillment payment cannot be reversed; record an accounting adjustment';
  end if;
  if new.fulfillment_payment_status not in ('due','paid','held') then
    raise exception 'Fulfillment payment status must be due, held, or paid';
  end if;
  if new.fulfillment_payment_status='paid' then
    select payment_status,status into order_payment,order_status
    from public.orders where id=new.order_id;
    if order_payment is distinct from 'paid'::public.payment_status or order_status='cancelled'::public.order_status then
      raise exception 'Fulfillment can be marked paid only for an active, paid order';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists order_items_guard_fulfillment_payment on public.order_items;
create trigger order_items_guard_fulfillment_payment
  before update of fulfillment_payment_status on public.order_items
  for each row execute function private.enforce_fulfillment_payment();

create or replace function private.sync_payables_after_customer_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.payment_status='paid'::public.payment_status
     and old.payment_status is distinct from new.payment_status then
    if new.status='cancelled'::public.order_status or new.inventory_status='released' then
      update public.order_items set payout_status='held'::public.payout_status
      where order_id=new.id and seller_id is not null and payout_status='not_due'::public.payout_status;
      update public.orders
      set inventory_issue=coalesce(inventory_issue,'Payment completed after inventory was released. Verify stock or refund.')
      where id=new.id;
    else
      update public.order_items set payout_status='due'::public.payout_status
      where order_id=new.id and seller_id is not null and payout_status='not_due'::public.payout_status;
    end if;
  elsif new.payment_status in ('refunded'::public.payment_status,'partially_refunded'::public.payment_status)
     and old.payment_status is distinct from new.payment_status then
    update public.order_items set payout_status='held'::public.payout_status
    where order_id=new.id and seller_id is not null and payout_status in ('due'::public.payout_status,'scheduled'::public.payout_status);
  end if;
  return new;
end;
$$;

create or replace function public.admin_record_cashflow_adjustment(
  target_direction text,
  target_amount numeric,
  target_currency text,
  target_method text,
  target_description text,
  request_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_id uuid;
  key_value text;
begin
  if not (select private.is_admin()) then raise exception 'Admin access required' using errcode='42501'; end if;
  if target_direction not in ('inflow','outflow')
     or target_amount is null or target_amount<=0
     or upper(target_currency) !~ '^[A-Z]{3}$'
     or target_method not in ('cash','bank_transfer','other')
     or nullif(btrim(target_description),'') is null
     or nullif(btrim(request_id),'') is null then
    raise exception 'Enter a valid amount, currency, method, and reason';
  end if;
  key_value:='manual-adjustment:'||request_id;
  insert into public.cashflow_entries(
    entry_type,direction,amount,currency,payment_method,idempotency_key,
    description,recorded_by
  ) values (
    'manual_adjustment',target_direction,round(target_amount,2),upper(target_currency),
    target_method,key_value,left(btrim(target_description),240),(select auth.uid())
  )
  on conflict (idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning id into result_id;
  return result_id;
end;
$$;
revoke all on function public.admin_record_cashflow_adjustment(text,numeric,text,text,text,text) from public,anon;
grant execute on function public.admin_record_cashflow_adjustment(text,numeric,text,text,text,text) to authenticated;

create or replace function private.reject_ledger_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Accounting and inventory ledger rows are immutable; create a correcting entry instead';
end;
$$;
drop trigger if exists inventory_movements_immutable on public.inventory_movements;
create trigger inventory_movements_immutable before update or delete on public.inventory_movements
  for each row execute function private.reject_ledger_mutation();
drop trigger if exists cashflow_entries_immutable on public.cashflow_entries;
create trigger cashflow_entries_immutable before update or delete on public.cashflow_entries
  for each row execute function private.reject_ledger_mutation();

create or replace function public.advance_order_journey(
  target_order_id uuid,
  target_status public.order_journey_status,
  note text default null
)
returns public.order_journey_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status public.order_journey_status;
  actor_role text;
  allowed boolean := false;
  mapped_order public.order_status;
  customer_payment public.payment_status;
begin
  if (select private.is_admin()) then
    actor_role:='admin';
  elsif exists (
    select 1 from public.order_items oi
    join public.seller_users su on su.seller_id=oi.seller_id
    where oi.order_id=target_order_id and su.user_id=(select auth.uid())
  ) then actor_role:='seller';
  elsif exists (
    select 1 from public.inbound_packages ip
    join public.fulfillment_users fu on fu.partner_id=ip.fulfillment_partner_id
    where ip.order_id=target_order_id and fu.user_id=(select auth.uid())
  ) then actor_role:='fulfillment';
  else raise exception 'You do not have access to this order' using errcode='42501';
  end if;

  select journey_status,payment_status into current_status,customer_payment
  from public.orders where id=target_order_id for update;
  if current_status is null then raise exception 'Order not found'; end if;
  if current_status=target_status then return target_status; end if;

  if target_status='cancelled' then
    if actor_role<>'admin' then raise exception 'Only admin can cancel an order' using errcode='42501'; end if;
    if current_status in ('sent_to_customer','package_in_transit','delivered') then
      raise exception 'An order cannot be cancelled after it has shipped to the customer';
    end if;
    allowed:=true;
  else
    if customer_payment is distinct from 'paid'::public.payment_status then
      raise exception 'Customer payment must be confirmed before fulfilment can advance';
    end if;
    if actor_role='admin' then
      allowed:=true;
    elsif actor_role='seller' then
      allowed:=(current_status='admin_confirmed' and target_status='seller_preparing')
        or (current_status='seller_preparing' and target_status='sent_to_fulfillment');
    elsif actor_role='fulfillment' then
      allowed:=(current_status='awaiting_package' and target_status='received_by_fulfillment')
        or (current_status='received_by_fulfillment' and target_status='qc_ongoing')
        or (current_status='qc_ongoing' and target_status='package_prepared')
        or (current_status='package_prepared' and target_status='sent_to_customer')
        or (current_status='sent_to_customer' and target_status='package_in_transit')
        or (current_status='package_in_transit' and target_status='delivered');
    end if;
  end if;
  if not allowed then raise exception 'This role cannot make that status change'; end if;

  mapped_order:=case
    when target_status='order_placed' then 'new'::public.order_status
    when target_status in ('admin_confirmed','seller_preparing','sent_to_fulfillment','awaiting_package','received_by_fulfillment','qc_ongoing')
      then 'confirmed'::public.order_status
    when target_status in ('package_prepared','preparing_for_customer') then 'packing'::public.order_status
    when target_status in ('sent_to_customer','package_in_transit') then 'shipped'::public.order_status
    when target_status='delivered' then 'delivered'::public.order_status
    else 'cancelled'::public.order_status
  end;

  update public.orders
  set journey_status=target_status,
      journey_timestamps=coalesce(journey_timestamps,'{}'::jsonb)||jsonb_build_object(target_status::text,now()),
      status=mapped_order,updated_at=now()
  where id=target_order_id;

  if target_status='seller_preparing' then
    update public.inbound_packages set status='seller_confirmed' where order_id=target_order_id;
  elsif target_status='sent_to_fulfillment' then
    update public.inbound_packages set status='inbound_transit' where order_id=target_order_id;
  elsif target_status='received_by_fulfillment' then
    update public.inbound_packages set status='received',received_at=coalesce(received_at,now()) where order_id=target_order_id;
  elsif target_status='package_prepared' then
    update public.inbound_packages set status='ready_to_pack' where order_id=target_order_id;
    update public.outbound_shipments set status='ready_to_pack' where order_id=target_order_id;
  elsif target_status in ('sent_to_customer','package_in_transit') then
    update public.outbound_shipments set status='outbound_shipped',shipped_at=coalesce(shipped_at,now()) where order_id=target_order_id;
  elsif target_status='delivered' then
    update public.outbound_shipments set status='delivered',delivered_at=coalesce(delivered_at,now()) where order_id=target_order_id;
  elsif target_status='cancelled' then
    update public.inbound_packages set status='cancelled' where order_id=target_order_id;
    update public.outbound_shipments set status='cancelled' where order_id=target_order_id;
  end if;

  insert into public.order_journey_events(order_id,status,changed_by,changed_by_role,note)
  values(target_order_id,target_status,(select auth.uid()),actor_role,note);
  return target_status;
end;
$$;
