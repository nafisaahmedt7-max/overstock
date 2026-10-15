create or replace function public.claim_brevo_order_confirmation()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  claimed private.brevo_email_outbox%rowtype;
  order_record public.orders%rowtype;
  item_list jsonb;
begin
  with next_email as (
    select id
    from private.brevo_email_outbox
    where attempts < 5 and (
      (status = 'queued' and available_at <= now())
      or (status = 'sending' and claimed_at < now() - interval '10 minutes')
    )
    order by created_at
    for update skip locked
    limit 1
  )
  update private.brevo_email_outbox q
  set status = 'sending',
      attempts = q.attempts + 1,
      claimed_at = now()
  from next_email n
  where q.id = n.id
  returning q.* into claimed;

  if claimed.id is null then
    return null;
  end if;

  select * into order_record
  from public.orders
  where id = claimed.order_id;

  if not found then
    update private.brevo_email_outbox
    set status = 'failed',
        last_error = 'Order not found',
        claimed_at = null
    where id = claimed.id;
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', oi.product_name,
        'quantity', oi.quantity,
        'size', oi.selected_size
      )
      order by oi.created_at
    ),
    '[]'::jsonb
  )
  into item_list
  from public.order_items oi
  where oi.order_id = claimed.order_id;

  return jsonb_build_object(
    'notification_id', claimed.id,
    'email', claimed.recipient_email,
    'customer_name', order_record.customer_name,
    'order_number', order_record.order_number,
    'delivery_address', order_record.delivery_address,
    'total_aud', order_record.payment_amount_aud,
    'items', item_list
  );
end;
$function$;
