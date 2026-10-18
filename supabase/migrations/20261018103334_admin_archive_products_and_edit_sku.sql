create or replace function public.admin_update_product(target_product_id uuid, payload jsonb)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  seller_id_value uuid;
  ownership_value public.product_ownership;
  cost numeric;
  inbound numeric;
  service numeric;
  gpo_rate numeric;
  weight integer;
  target numeric;
  seller_pct numeric;
  price_value numeric;
  stock_count integer;
  current_stock integer;
  requested_status public.product_status;
  listing_status public.product_status;
begin
  if not private.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  seller_id_value := nullif(payload->>'seller_id', '')::uuid;
  ownership_value := (payload->>'ownership')::public.product_ownership;
  cost := coalesce((payload->>'cost_of_goods')::numeric, 0);
  inbound := coalesce((payload->>'inbound_delivery_fee')::numeric, 0);
  service := coalesce((payload->>'fulfillment_service_fee')::numeric, 5);
  gpo_rate := coalesce((payload->>'gpo_fee_per_500g')::numeric, 2.5);
  weight := coalesce((payload->>'weight_grams')::integer, 500);
  target := coalesce((payload->>'overstock_profit_target')::numeric, 0);
  select stock_quantity into current_stock
  from public.products
  where id = target_product_id
  for update;
  if not found then raise exception 'Product not found'; end if;

  stock_count := coalesce(nullif(payload->>'stock_quantity', '')::integer, current_stock);
  requested_status := coalesce(nullif(payload->>'status', '')::public.product_status, 'active'::public.product_status);
  if stock_count < 0 then
    raise exception 'Stock quantity cannot be negative';
  end if;

  listing_status := case
    when requested_status = 'archived'::public.product_status then 'archived'::public.product_status
    when stock_count > 0 then 'active'::public.product_status
    else 'sold_out'::public.product_status
  end;

  seller_pct := case
    when ownership_value = 'seller'
      then coalesce((select commission_percent from public.sellers where id = seller_id_value), 0)
    else 0
  end;
  price_value := round(
    cost
    + case when ownership_value = 'seller' then inbound else 0 end
    + service
    + ceil(weight::numeric / 500) * gpo_rate
    + case when seller_pct > 0 then target / (1 - seller_pct / 100) else target end,
    2
  );

  update public.products
  set sku = coalesce(nullif(upper(btrim(payload->>'sku')), ''), sku),
      name = payload->>'name',
      description = coalesce(payload->>'description', ''),
      audience = payload->>'audience',
      category = payload->>'category',
      brand = coalesce(payload->>'brand', ''),
      color = coalesce(payload->>'color', ''),
      condition = coalesce(payload->>'condition', ''),
      sizes = array(select jsonb_array_elements_text(payload->'sizes')),
      price = price_value,
      stock_quantity = stock_count,
      ownership = ownership_value,
      seller_id = seller_id_value,
      status = listing_status,
      cost_of_goods = cost,
      inbound_delivery_fee = inbound,
      fulfillment_service_fee = service,
      gpo_fee_per_500g = gpo_rate,
      weight_grams = weight,
      overstock_profit_target = target
  where id = target_product_id;
end;
$function$;

create or replace function public.admin_archive_product(target_product_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not private.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  update public.products
  set status = 'archived'::public.product_status
  where id = target_product_id;

  if not found then raise exception 'Product not found'; end if;
end;
$function$;

revoke all on function public.admin_archive_product(uuid) from public, anon;
grant execute on function public.admin_archive_product(uuid) to authenticated;
