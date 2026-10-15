create index if not exists cashflow_entries_order_item_idx
  on public.cashflow_entries(order_item_id) where order_item_id is not null;

drop policy if exists square_webhook_events_deny_direct on public.square_webhook_events;
create policy square_webhook_events_deny_direct
  on public.square_webhook_events for select to authenticated using (false);

do $migration$
declare
  function_sql text;
  old_text text;
  new_text text;
begin
  select pg_get_functiondef('public.admin_record_cashflow_adjustment(text,numeric,text,text,text,text)'::regprocedure)
    into function_sql;
  old_text := $old$
  on conflict (idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning id into result_id;
  return result_id;
$old$;
  new_text := $new$
  on conflict (idempotency_key) do nothing
  returning id into result_id;
  if result_id is null then
    select id into result_id from public.cashflow_entries where idempotency_key=key_value;
  end if;
  return result_id;
$new$;
  if position(old_text in function_sql)=0 then
    raise exception 'Cashflow idempotency function body changed unexpectedly';
  end if;
  execute replace(function_sql,old_text,new_text);

  select pg_get_functiondef('public.create_checkout_order(jsonb)'::regprocedure)
    into function_sql;
  old_text := $old$
  insert into public.order_journey_events(order_id,status,changed_by,changed_by_role,note)
  values(v_order_id,'order_placed'::public.order_journey_status,null,'system','Customer started Square checkout; stock reserved for 30 minutes.');

  return jsonb_build_object(
    'id',v_order_id,'order_number',v_order_number,'subtotal',v_subtotal,
    'payment_amount_aud',v_payment_aud
  );
$old$;
  new_text := $new$
  select round(sum(gross_amount),2)
    into v_subtotal from public.order_items where order_id=v_order_id;
  if v_subtotal is null or v_subtotal <= 0 or v_subtotal > 5000 then
    raise exception 'Invalid checkout total';
  end if;
  v_payment_aud := round(v_subtotal * v_fx_aud,2);
  update public.orders
    set subtotal=v_subtotal,payment_amount_aud=v_payment_aud
    where id=v_order_id;

  insert into public.order_journey_events(order_id,status,changed_by,changed_by_role,note)
  values(v_order_id,'order_placed'::public.order_journey_status,null,'system','Customer started Square checkout; stock reserved for 30 minutes.');

  return jsonb_build_object(
    'id',v_order_id,'order_number',v_order_number,'subtotal',v_subtotal,
    'payment_amount_aud',v_payment_aud
  );
$new$;
  if position(old_text in function_sql)=0 then
    raise exception 'Checkout function body changed unexpectedly';
  end if;
  execute replace(function_sql,old_text,new_text);
end
$migration$;
