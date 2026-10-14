alter table public.orders
  add column if not exists square_order_id text,
  add column if not exists square_payment_link_id text,
  add column if not exists square_payment_id text,
  add column if not exists payment_amount_aud numeric(12,2),
  add column if not exists fx_rate_usd_to_aud numeric(14,8),
  add column if not exists buyer_currency text,
  add column if not exists fx_rate_usd_to_buyer numeric(14,8);

create unique index if not exists orders_square_order_id_key
  on public.orders (square_order_id)
  where square_order_id is not null;

create index if not exists orders_square_payment_link_id_idx
  on public.orders (square_payment_link_id)
  where square_payment_link_id is not null;
