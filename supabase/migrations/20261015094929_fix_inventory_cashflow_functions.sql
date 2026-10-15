
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
    if v_after = 0 then return new; end if;
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
    product_id,order_id,movement_type,quantity_delta,stock_before,stock_after,
    reason,created_by,idempotency_key
  ) values (
    new.id,v_order_id,v_type,v_after-v_before,v_before,v_after,
    v_reason,auth.uid(),
    case when v_order_id is not null and v_type in ('checkout_reserved','reservation_released','sale_committed')
      then v_type||':'||v_order_id::text||':'||new.id::text else null end
  ) on conflict (idempotency_key) do nothing;
  return new;
end;
$$;

create or replace function public.process_square_webhook_event(square_event jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id text := nullif(square_event->>'event_id','');
  v_event_type text := coalesce(square_event->>'type','');
  v_payment jsonb;
  v_refund jsonb;
  v_payment_id text;
  v_square_order_id text;
  v_resource_id text;
  v_state text;
  v_amount numeric;
  v_currency text;
  v_fee numeric;
  v_refund_amount numeric;
  v_refund_currency text;
  v_order public.orders%rowtype;
  v_fee_item jsonb;
  v_refunded_total numeric;
begin
  if v_event_id is null then raise exception 'Square webhook event has no event_id'; end if;
  if v_event_type in ('payment.created','payment.updated') then
    v_payment := square_event #> '{data,object,payment}';
    v_payment_id := v_payment->>'id';
    v_square_order_id := v_payment->>'order_id';
    v_resource_id := v_payment_id;
  elsif v_event_type in ('refund.created','refund.updated') then
    v_refund := square_event #> '{data,object,refund}';
    v_payment_id := v_refund->>'payment_id';
    v_resource_id := v_refund->>'id';
  else
    return true;
  end if;

  insert into public.square_webhook_events(event_id,event_type,resource_id)
  values(v_event_id,v_event_type,v_resource_id)
  on conflict (event_id) do nothing;
  if not found then return true; end if;

  if v_event_type in ('payment.created','payment.updated') then
    if v_square_order_id is null then return true; end if;
    select o.* into v_order from public.orders o
      where o.square_order_id=v_square_order_id for update;
    if not found then return true; end if;
    v_state := v_payment->>'status';

    if v_state='COMPLETED' then
      if v_payment_id is null then raise exception 'Square completed payment has no payment ID'; end if;
      v_amount := coalesce((v_payment #>> '{amount_money,amount}')::numeric/100,null);
      v_currency := v_payment #>> '{amount_money,currency}';
      if v_amount is null or v_currency <> 'AUD' or v_amount <> v_order.payment_amount_aud then
        raise exception 'Square payment does not match expected order amount and currency';
      end if;

      update public.orders
      set square_payment_id=v_payment_id,
          payment_status='paid'::public.payment_status,
          inventory_status=case when inventory_status='reserved' then 'committed' else inventory_status end,
          inventory_issue=case when inventory_status='released'
            then 'Stock hold expired before Square payment completed; verify stock or refund.'
            else inventory_issue end,
          updated_at=now()
      where id=v_order.id;

      perform public.record_order_cashflow(
        v_order.id,null,'customer_payment','inflow',v_amount,'AUD','square',
        'square-payment:'||v_payment_id,'Square customer payment',v_payment_id
      );

      v_fee := 0;
      for v_fee_item in select value from jsonb_array_elements(coalesce(v_payment->'processing_fee','[]'::jsonb)) as f(value)
      loop
        v_fee := v_fee + coalesce((v_fee_item #>> '{amount_money,amount}')::numeric/100,0);
      end loop;
      if v_fee > 0 then
        perform public.record_order_cashflow(
          v_order.id,null,'square_processing_fee','outflow',v_fee,'AUD','square',
          'square-fee:'||v_payment_id,'Square processing fee',v_payment_id
        );
      end if;

      if v_order.inventory_status='released' then
        insert into public.order_journey_events(order_id,status,changed_by,changed_by_role,note)
        values(v_order.id,v_order.journey_status,null,'system',
          'Payment completed after the inventory hold expired. Confirm stock is available or issue a Square refund.');
      end if;

    elsif v_state in ('FAILED','CANCELED') and v_order.payment_status='unpaid' then
      update public.orders
      set square_payment_id=coalesce(v_payment_id,square_payment_id),
          status='cancelled'::public.order_status,
          journey_status='cancelled'::public.order_journey_status,
          updated_at=now(),
          internal_notes=concat_ws(E'\n',nullif(internal_notes,''),'Square payment failed or was cancelled; stock reservation released.')
      where id=v_order.id;
      insert into public.order_journey_events(order_id,status,changed_by,changed_by_role,note)
      values(v_order.id,'cancelled'::public.order_journey_status,null,'system',
        'Square payment failed or was cancelled; reserved stock was released.');
    else
      update public.orders set square_payment_id=coalesce(v_payment_id,square_payment_id),updated_at=now()
      where id=v_order.id;
    end if;

  elsif v_event_type in ('refund.created','refund.updated') then
    if v_refund->>'status' <> 'COMPLETED' or v_payment_id is null then return true; end if;
    select o.* into v_order from public.orders o
      where o.square_payment_id=v_payment_id for update;
    if not found then return true; end if;
    v_refund_amount := coalesce((v_refund #>> '{amount_money,amount}')::numeric/100,null);
    v_refund_currency := v_refund #>> '{amount_money,currency}';
    if v_refund_amount is null or v_refund_amount <= 0 or v_refund_currency <> 'AUD' then
      raise exception 'Square refund has an invalid amount or currency';
    end if;
    perform public.record_order_cashflow(
      v_order.id,null,'customer_refund','outflow',v_refund_amount,'AUD','square',
      'square-refund:'||coalesce(v_refund->>'id',v_event_id),'Square customer refund',
      coalesce(v_refund->>'id',v_event_id)
    );
    select coalesce(sum(e.amount),0) into v_refunded_total
    from public.cashflow_entries e
    where e.order_id=v_order.id and e.entry_type='customer_refund' and e.status='posted';
    if v_refunded_total > v_order.payment_amount_aud then
      raise exception 'Square refunds exceed captured customer payments';
    end if;
    update public.orders
    set square_refunded_amount=v_refunded_total,
        payment_status=case
          when v_refunded_total >= payment_amount_aud then 'refunded'::public.payment_status
          else 'partially_refunded'::public.payment_status
        end,
        updated_at=now()
    where id=v_order.id;
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
  selected_size_value text;
  payment_method_value text := coalesce(nullif(payload->>'payment_method',''),'cash');
begin
  if not (select private.is_admin()) then
    raise exception 'Admin access required' using errcode='42501';
  end if;
  if payment_method_value not in ('cash','bank_transfer','other') then
    raise exception 'Select cash, bank transfer, or other for a manually recorded sale';
  end if;
  q:=greatest(coalesce((payload->>'quantity')::integer,1),1);
  if q>10 then raise exception 'Manual order quantity cannot exceed 10 per line'; end if;
  select * into p from public.products where id=(payload->>'product_id')::uuid for update;
  if not found then raise exception 'Product not found'; end if;
  if p.status in ('archived','draft') or p.stock_quantity<q then
    raise exception 'STOCK_UNAVAILABLE: % has only % available',p.name,p.stock_quantity;
  end if;
  selected_size_value:=nullif(btrim(payload->>'selected_size'),'');
  if selected_size_value is not null and not (selected_size_value=any(p.sizes)) then
    raise exception 'Selected size is unavailable';
  end if;
  if selected_size_value is null and cardinality(p.sizes)>0 then raise exception 'Select a size'; end if;
  customer_total:=round(p.price*q,2);

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
  values(new_order_id,p.id,q,selected_size_value,nullif(payload->>'selected_color',''));
  update public.order_items set payout_status='due'::public.payout_status
  where order_id=new_order_id and seller_id is not null;

  insert into public.order_journey_events(order_id,status,changed_by,changed_by_role,note)
  values(new_order_id,'order_placed',(select auth.uid()),'admin','Manual sale recorded; customer payment received.');
  perform public.record_order_cashflow(
    new_order_id,null,'customer_payment','inflow',customer_total,'USD',
    payment_method_value,'manual-sale:'||new_order_id::text,
    'Manual customer payment recorded',null
  );
  return new_order_id;
end;
$$;
