-- Make available stock the source of truth for active/sold-out catalog status.
-- Draft products remain hidden until reviewed; archived products stay hidden.

CREATE OR REPLACE FUNCTION public.admin_create_product(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  result_id uuid;
  seller_id_value uuid;
  ownership_value public.product_ownership;
  cost numeric;
  inbound numeric;
  service numeric;
  gpo_rate numeric;
  weight integer;
  price_value numeric;
  seller_pct numeric;
  profit_pool numeric;
  admin_profit numeric;
  minimum_profit numeric;
  stock_count integer;
  listing_status public.product_status;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING errcode='42501';
  END IF;

  seller_id_value := nullif(payload->>'seller_id','')::uuid;
  ownership_value := (payload->>'ownership')::public.product_ownership;
  cost := coalesce((payload->>'cost_of_goods')::numeric,0);
  inbound := coalesce((payload->>'inbound_delivery_fee')::numeric,0);
  service := coalesce((payload->>'fulfillment_service_fee')::numeric,5);
  gpo_rate := coalesce((payload->>'gpo_fee_per_500g')::numeric,2.5);
  weight := coalesce((payload->>'weight_grams')::integer,500);
  price_value := (payload->>'price')::numeric;
  minimum_profit := coalesce((payload->>'minimum_overstock_profit')::numeric,0);
  stock_count := coalesce(nullif(payload->>'stock_quantity','')::integer,1);

  IF stock_count < 0 THEN
    RAISE EXCEPTION 'Stock quantity cannot be negative';
  END IF;

  listing_status := CASE
    WHEN stock_count > 0 THEN 'active'::public.product_status
    ELSE 'sold_out'::public.product_status
  END;

  seller_pct := CASE
    WHEN ownership_value='seller'
    THEN coalesce((SELECT commission_percent FROM public.sellers WHERE id=seller_id_value),0)
    ELSE 0
  END;
  profit_pool := price_value-cost-CASE WHEN ownership_value='seller' THEN inbound ELSE 0 END-service-ceil(weight::numeric/500)*gpo_rate;
  admin_profit := profit_pool*(1-seller_pct/100);

  IF admin_profit < minimum_profit THEN
    RAISE EXCEPTION 'Selling price is too low. It must leave at least % for OVERSTOCK after all costs and seller share', minimum_profit;
  END IF;

  INSERT INTO public.products(
    sku,slug,name,description,audience,category,brand,color,condition,sizes,price,
    stock_quantity,ownership,seller_id,status,cost_of_goods,inbound_delivery_fee,
    fulfillment_service_fee,gpo_fee_per_500g,weight_grams,minimum_overstock_profit
  )
  VALUES(
    upper(payload->>'sku'),payload->>'slug',payload->>'name',coalesce(payload->>'description',''),
    payload->>'audience',payload->>'category',coalesce(payload->>'brand',''),coalesce(payload->>'color',''),
    coalesce(payload->>'condition',''),array(SELECT jsonb_array_elements_text(payload->'sizes')),
    price_value,stock_count,ownership_value,seller_id_value,listing_status,cost,inbound,
    service,gpo_rate,weight,minimum_profit
  )
  RETURNING id INTO result_id;

  RETURN result_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_product(target_product_id uuid, payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
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
  requested_status public.product_status;
  listing_status public.product_status;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING errcode='42501';
  END IF;

  seller_id_value := nullif(payload->>'seller_id','')::uuid;
  ownership_value := (payload->>'ownership')::public.product_ownership;
  cost := coalesce((payload->>'cost_of_goods')::numeric,0);
  inbound := coalesce((payload->>'inbound_delivery_fee')::numeric,0);
  service := coalesce((payload->>'fulfillment_service_fee')::numeric,5);
  gpo_rate := coalesce((payload->>'gpo_fee_per_500g')::numeric,2.5);
  weight := coalesce((payload->>'weight_grams')::integer,500);
  target := coalesce((payload->>'overstock_profit_target')::numeric,0);
  stock_count := coalesce(nullif(payload->>'stock_quantity','')::integer,1);
  requested_status := coalesce(nullif(payload->>'status','')::public.product_status,'active'::public.product_status);

  IF stock_count < 0 THEN
    RAISE EXCEPTION 'Stock quantity cannot be negative';
  END IF;

  listing_status := CASE
    WHEN requested_status='archived'::public.product_status THEN 'archived'::public.product_status
    WHEN stock_count > 0 THEN 'active'::public.product_status
    ELSE 'sold_out'::public.product_status
  END;

  seller_pct := CASE
    WHEN ownership_value='seller'
    THEN coalesce((SELECT commission_percent FROM public.sellers WHERE id=seller_id_value),0)
    ELSE 0
  END;
  price_value := round(cost+CASE WHEN ownership_value='seller' THEN inbound ELSE 0 END+service+ceil(weight::numeric/500)*gpo_rate+CASE WHEN seller_pct>0 THEN target/(1-seller_pct/100) ELSE target END,2);

  UPDATE public.products
  SET name=payload->>'name',
      description=coalesce(payload->>'description',''),
      audience=payload->>'audience',
      category=payload->>'category',
      brand=coalesce(payload->>'brand',''),
      color=coalesce(payload->>'color',''),
      condition=coalesce(payload->>'condition',''),
      sizes=array(SELECT jsonb_array_elements_text(payload->'sizes')),
      price=price_value,
      stock_quantity=stock_count,
      ownership=ownership_value,
      seller_id=seller_id_value,
      status=listing_status,
      cost_of_goods=cost,
      inbound_delivery_fee=inbound,
      fulfillment_service_fee=service,
      gpo_fee_per_500g=gpo_rate,
      weight_grams=weight,
      overstock_profit_target=target
  WHERE id=target_product_id;
END;
$function$;
