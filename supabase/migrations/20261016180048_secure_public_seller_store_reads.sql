drop view if exists public.public_seller_stores;

revoke all on table public.sellers from anon;
grant select (id, seller_code, display_name) on table public.sellers to anon;

create policy sellers_public_store_directory
on public.sellers
for select
to anon
using (
  status = 'active'
  and exists (
    select 1
    from public.products as p
    where p.seller_id = sellers.id
      and p.status = 'active'
  )
);
