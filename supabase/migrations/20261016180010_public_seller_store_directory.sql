create or replace view public.public_seller_stores
with (security_invoker = false, security_barrier = true)
as
select s.id, s.seller_code, s.display_name
from public.sellers as s
where s.status = 'active'
  and exists (
    select 1
    from public.products as p
    where p.seller_id = s.id
      and p.status = 'active'
  );

comment on view public.public_seller_stores is
  'Public storefront directory. Exposes only seller id, code, and display name for active sellers with active products.';

revoke all on public.public_seller_stores from public, anon, authenticated;
grant select on public.public_seller_stores to anon, authenticated;
