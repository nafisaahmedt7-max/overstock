create table if not exists private.brevo_email_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  notification_type text not null check (notification_type = 'order_confirmation'),
  recipient_email text not null,
  status text not null default 'queued' check (status in ('queued','sending','sent','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  unique (order_id, notification_type)
);
alter table private.brevo_email_outbox enable row level security;
revoke all on table private.brevo_email_outbox from public, anon, authenticated;

create or replace function private.queue_brevo_order_confirmation()
returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if old.payment_status::text is distinct from new.payment_status::text
     and new.payment_status::text='paid'
     and new.sales_channel='website'
     and nullif(btrim(new.customer_email),'') is not null then
    insert into private.brevo_email_outbox(order_id,notification_type,recipient_email)
    values(new.id,'order_confirmation',lower(btrim(new.customer_email)))
    on conflict (order_id,notification_type) do nothing;
  end if;
  return new;
end;
$function$;

drop trigger if exists queue_brevo_order_confirmation on public.orders;
create trigger queue_brevo_order_confirmation
after update of payment_status on public.orders
for each row execute function private.queue_brevo_order_confirmation();

create or replace function public.claim_brevo_order_confirmation()
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  claimed private.brevo_email_outbox%rowtype;
  order_record public.orders%rowtype;
  item_list jsonb;
begin
  with next_email as (
    select id from private.brevo_email_outbox
    where attempts < 5 and (
      (status='queued' and available_at <= now())
      or (status='sending' and claimed_at < now()-interval '10 minutes')
    )
    order by created_at
    for update skip locked limit 1
  )
  update private.brevo_email_outbox q
  set status='sending', attempts=q.attempts+1, claimed_at=now()
  from next_email n
  where q.id=n.id
  returning q.* into claimed;
  if claimed.id is null then return null; end if;

  select * into order_record from public.orders where id=claimed.order_id;
  if not found then
    update private.brevo_email_outbox set status='failed',last_error='Order not found',claimed_at=null where id=claimed.id;
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'name',oi.product_name,'quantity',oi.quantity,'size',oi.selected_size
  ) order by oi.created_at),'[]'::jsonb)
  into item_list from public.order_items oi where oi.order_id=claimed.order_id;

  return jsonb_build_object(
    'notification_id',claimed.id,'email',claimed.recipient_email,
    'customer_name',order_record.customer_name,'order_number',order_record.order_number,
    'total_aud',order_record.payment_amount_aud,'items',item_list
  );
end;
$function$;

create or replace function public.complete_brevo_order_confirmation(notification_id uuid, provider_message_id text)
returns void language plpgsql security definer set search_path to ''
as $function$
begin
  update private.brevo_email_outbox
  set status='sent',sent_at=now(),provider_message_id=left(provider_message_id,500),claimed_at=null,last_error=null
  where id=notification_id and status='sending';
  if not found then raise exception 'Email notification is not claimed'; end if;
end;
$function$;

create or replace function public.retry_brevo_order_confirmation(notification_id uuid, error_message text)
returns void language plpgsql security definer set search_path to ''
as $function$
begin
  update private.brevo_email_outbox
  set status=case when attempts>=5 then 'failed' else 'queued' end,
      available_at=now()+make_interval(mins => least(60,(5*power(2,greatest(attempts-1,0)))::integer)),
      claimed_at=null,last_error=left(coalesce(error_message,'Email delivery failed'),500)
  where id=notification_id and status='sending';
  if not found then raise exception 'Email notification is not claimed'; end if;
end;
$function$;

revoke all on function public.claim_brevo_order_confirmation() from public, anon, authenticated;
revoke all on function public.complete_brevo_order_confirmation(uuid,text) from public, anon, authenticated;
revoke all on function public.retry_brevo_order_confirmation(uuid,text) from public, anon, authenticated;
grant execute on function public.claim_brevo_order_confirmation() to service_role;
grant execute on function public.complete_brevo_order_confirmation(uuid,text) to service_role;
grant execute on function public.retry_brevo_order_confirmation(uuid,text) to service_role;