
update public.orders
set payment_method='other'
where sales_channel='admin_manual'
  and payment_status='paid'::public.payment_status
  and square_payment_id is null
  and payment_method='square';

insert into public.cashflow_entries(
  order_id,entry_type,direction,amount,currency,payment_method,
  idempotency_key,external_reference,description,occurred_at
)
select o.id,'customer_payment','inflow',o.payment_amount_aud,'AUD','square',
       'square-payment:'||o.square_payment_id,o.square_payment_id,
       'Historical Square customer payment',coalesce(o.updated_at,o.placed_at)
from public.orders o
where o.payment_status in ('paid'::public.payment_status,'partially_refunded'::public.payment_status,'refunded'::public.payment_status)
  and o.square_payment_id is not null and coalesce(o.payment_amount_aud,0)>0
on conflict (idempotency_key) do nothing;

insert into public.cashflow_entries(
  order_id,order_item_id,entry_type,direction,amount,currency,payment_method,
  idempotency_key,description,occurred_at
)
select oi.order_id,oi.id,'seller_payout','outflow',oi.seller_payout_total,'USD','bank_transfer',
       'seller-payout:'||oi.id::text,'Historical seller payout marked as sent',coalesce(oi.payout_date::timestamptz,oi.created_at)
from public.order_items oi
where oi.seller_id is not null and oi.payout_status='paid'::public.payout_status
  and coalesce(oi.seller_payout_total,0)>0
on conflict (idempotency_key) do nothing;

insert into public.cashflow_entries(
  order_id,order_item_id,entry_type,direction,amount,currency,payment_method,
  idempotency_key,description,occurred_at
)
select oi.order_id,oi.id,'fulfillment_payment','outflow',
       coalesce(oi.fulfillment_service_fee,0)+coalesce(oi.gpo_fee,0),'USD','bank_transfer',
       'fulfillment-payment:'||oi.id::text,'Historical fulfillment payment marked as sent',oi.created_at
from public.order_items oi
where oi.fulfillment_payment_status='paid'
  and coalesce(oi.fulfillment_service_fee,0)+coalesce(oi.gpo_fee,0)>0
on conflict (idempotency_key) do nothing;

insert into public.cashflow_entries(
  order_id,entry_type,direction,amount,currency,payment_method,
  idempotency_key,description,occurred_at
)
select o.id,'seller_refund_recovery','inflow',o.seller_refund_recovery_amount,'USD','bank_transfer',
       'seller-refund-recovery:'||o.id::text,'Historical seller refund recovery marked as received',
       coalesce(o.refund_completed_at,o.updated_at)
from public.orders o
where o.refund_status='completed' and coalesce(o.seller_refund_recovery_amount,0)>0
on conflict (idempotency_key) do nothing;

insert into public.cashflow_entries(
  order_id,entry_type,direction,amount,currency,payment_method,
  idempotency_key,description,occurred_at
)
select o.id,'customer_payment','inflow',o.total,'USD',case when o.payment_method in ('cash','bank_transfer','other') then o.payment_method else 'other' end,
       'legacy-manual-sale:'||o.id::text,'Historical manual customer payment',o.placed_at
from public.orders o
where o.sales_channel='admin_manual'
  and o.payment_status='paid'::public.payment_status
  and o.square_payment_id is null and coalesce(o.total,0)>0
on conflict (idempotency_key) do nothing;
