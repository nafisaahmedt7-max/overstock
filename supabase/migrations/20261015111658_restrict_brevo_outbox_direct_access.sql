create policy brevo_email_outbox_deny_direct
on private.brevo_email_outbox
for all to anon,authenticated
using (false)
with check (false);
