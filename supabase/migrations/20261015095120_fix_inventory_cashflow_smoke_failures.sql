
create or replace function private.populate_order_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_product public.products%rowtype;
  selected_share numeric(5,2) := 0;
  item_gross numeric;
  item_base_cost numeric;
  service_cost numeric;
  shipping_cost numeric;
  profit_pool numeric;
  seller_profit numeric;
begin
  select * into selected_product from public.products where id=new.product_id;
  if not found then raise exception 'Product not found'; end if;
  if new.quantity is null or new.quantity < 1 then raise exception 'Quantity must be at least one'; end if;
  if selected_product.ownership='seller' then
    if selected_product.seller_id is null or not exists (
      select 1 from public.sellers where id=selected_product.seller_id and status='active'
    ) then raise exception 'Seller is not active'; end if;
    select commission_percent into selected_share from public.sellers where id=selected_product.seller_id;
  end if;

  new.seller_id:=selected_product.seller_id;
  new.ownership:=selected_product.ownership;
  new.product_name:=selected_product.name;
  new.sku:=selected_product.sku;
  new.unit_price:=selected_product.price;
  item_gross:=new.unit_price*new.quantity;
  item_base_cost:=coalesce(selected_product.cost_of_goods,0)*new.quantity;
  if selected_product.ownership='seller' then
    item_base_cost:=item_base_cost+coalesce(selected_product.inbound_delivery_fee,0)*new.quantity;
  end if;
  service_cost:=coalesce(selected_product.fulfillment_service_fee,0)*new.quantity;
  shipping_cost:=ceil((greatest(coalesce(selected_product.weight_grams,500),1)*new.quantity)::numeric/500)
    *coalesce(selected_product.gpo_fee_per_500g,0);
  profit_pool:=item_gross-item_base_cost-service_cost-shipping_cost;
  seller_profit:=case when selected_product.ownership='seller' then round(profit_pool*selected_share/100,2) else 0 end;

  new.commission_percent:=selected_share;
  new.item_cost:=coalesce(selected_product.cost_of_goods,0)*new.quantity;
  new.inbound_delivery_fee:=case when selected_product.ownership='seller'
    then coalesce(selected_product.inbound_delivery_fee,0)*new.quantity else 0 end;
  new.fulfillment_service_fee:=service_cost;
  new.gpo_fee:=shipping_cost;
  new.seller_profit_amount:=seller_profit;
  new.seller_payout_total:=case when selected_product.ownership='seller' then item_base_cost+seller_profit else 0 end;
  new.payout_status:='not_due'::public.payout_status;
  if selected_product.ownership='seller' and new.fulfillment_status='unassigned'::public.fulfillment_status then
    new.fulfillment_status:='assigned'::public.fulfillment_status;
  end if;
  return new;
end;
$$;

create or replace function private.release_order_inventory(target_order_id uuid, release_reason text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.orders%rowtype;
  item record;
begin
  select * into order_row from public.orders where id=target_order_id for update;
  if not found or order_row.inventory_status not in ('reserved','committed') then return false; end if;

  perform set_config('app.inventory_movement_type','reservation_released',true);
  perform set_config('app.inventory_order_id',target_order_id::text,true);
  perform set_config('app.inventory_reason',left(coalesce(release_reason,'Order cancelled; stock returned'),240),true);

  for item in
    select product_id,sum(quantity)::integer quantity
    from public.order_items where order_id=target_order_id and product_id is not null
    group by product_id order by product_id
  loop
    update public.products
    set stock_quantity=stock_quantity+item.quantity,
        status=case
          when status in ('draft','archived') then status
          else 'active'::public.product_status
        end
    where id=item.product_id;
  end loop;
  update public.orders
  set inventory_status='released',inventory_expires_at=null,updated_at=now()
  where id=target_order_id;
  return true;
end;
$$;

create or replace function private.release_inventory_when_order_cancelled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.journey_status='cancelled'
     and old.journey_status is distinct from new.journey_status
     and new.inventory_status in ('reserved','committed')
     and old.journey_status not in (
       'sent_to_customer'::public.order_journey_status,
       'package_in_transit'::public.order_journey_status,
       'delivered'::public.order_journey_status
     ) then
    perform private.release_order_inventory(new.id,'Order cancelled before customer shipment; stock returned to available inventory');
  end if;
  return new;
end;
$$;
