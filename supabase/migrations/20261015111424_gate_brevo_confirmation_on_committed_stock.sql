create or replace function private.queue_brevo_order_confirmation()
returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if new.payment_status::text='paid'
     and new.sales_channel='website'
     and new.inventory_status='committed'
     and nullif(btrim(new.inventory_issue),'') is null
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
after update of payment_status,inventory_status,inventory_issue on public.orders
for each row execute function private.queue_brevo_order_confirmation();
