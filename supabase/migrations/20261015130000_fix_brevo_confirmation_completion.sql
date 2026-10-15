-- Resolve ambiguous PL/pgSQL parameter references when recording Brevo acceptance.
-- Brevo may already have accepted the message before this function is called.
create or replace function public.complete_brevo_order_confirmation(
  notification_id uuid,
  provider_message_id text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  update private.brevo_email_outbox
  set
    status = 'sent',
    sent_at = now(),
    provider_message_id = left($2, 500),
    claimed_at = null,
    last_error = null
  where id = $1 and status = 'sending';

  if not found then
    raise exception 'Email notification is not claimed';
  end if;
end;
$function$;
