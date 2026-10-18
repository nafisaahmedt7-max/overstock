-- Preserve inventory and order history when an admin permanently deletes a product.
alter table public.inventory_movements
  alter column product_id drop not null,
  add column if not exists product_name text,
  add column if not exists product_sku text;

update public.inventory_movements as movement
set product_name = coalesce(movement.product_name, product.name),
    product_sku = coalesce(movement.product_sku, product.sku)
from public.products as product
where movement.product_id = product.id
  and (movement.product_name is null or movement.product_sku is null);

alter table public.inventory_movements
  drop constraint inventory_movements_product_id_fkey,
  add constraint inventory_movements_product_id_fkey
    foreign key (product_id)
    references public.products(id)
    on delete set null;

create or replace function private.snapshot_inventory_product_before_delete()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if auth.uid() is not null and not private.is_admin() then
    raise exception 'Only administrators may permanently delete products';
  end if;

  update public.inventory_movements
  set product_name = coalesce(product_name, old.name),
      product_sku = coalesce(product_sku, old.sku)
  where product_id = old.id;

  return old;
end;
$function$;

revoke all on function private.snapshot_inventory_product_before_delete() from public;
grant execute on function private.snapshot_inventory_product_before_delete() to authenticated, service_role;

drop trigger if exists snapshot_inventory_product_before_delete on public.products;
create trigger snapshot_inventory_product_before_delete
before delete on public.products
for each row
execute function private.snapshot_inventory_product_before_delete();
