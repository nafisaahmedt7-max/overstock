-- Keep seller payouts tied to confirmed customer payments, and add shared API rate limits.

CREATE TABLE IF NOT EXISTS private.api_rate_limit_windows (
  key_hash text NOT NULL,
  bucket_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1 CHECK (request_count > 0),
  PRIMARY KEY (key_hash, bucket_start)
);

ALTER TABLE private.api_rate_limit_windows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.api_rate_limit_windows FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_bucket_start timestamptz;
  v_request_count integer;
BEGIN
  IF p_key IS NULL
    OR p_key !~ '^(checkout|verify):[a-f0-9]{64}$'
    OR p_limit < 1 OR p_limit > 100
    OR p_window_seconds < 1 OR p_window_seconds > 3600 THEN
    RETURN false;
  END IF;

  v_bucket_start := pg_catalog.date_bin(
    pg_catalog.make_interval(secs => p_window_seconds),
    pg_catalog.clock_timestamp(),
    'epoch'::timestamptz
  );

  INSERT INTO private.api_rate_limit_windows AS current_window (key_hash, bucket_start, request_count)
  VALUES (p_key, v_bucket_start, 1)
  ON CONFLICT (key_hash, bucket_start)
  DO UPDATE SET request_count = current_window.request_count + 1
  RETURNING request_count INTO v_request_count;

  IF v_request_count = 1 AND pg_catalog.random() < 0.01 THEN
    DELETE FROM private.api_rate_limit_windows
    WHERE bucket_start < pg_catalog.clock_timestamp() - interval '1 day';
  END IF;

  RETURN v_request_count <= p_limit;
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_api_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(text, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION private.populate_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  selected_product public.products%rowtype;
  selected_share numeric(5,2) := 0;
  item_gross numeric;
  item_base_cost numeric;
  service_cost numeric;
  shipping_cost numeric;
  profit_pool numeric;
  seller_profit numeric;
BEGIN
  SELECT * INTO selected_product
  FROM public.products
  WHERE id = new.product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  IF new.quantity IS NULL OR new.quantity < 1 THEN
    RAISE EXCEPTION 'Quantity must be at least one';
  END IF;
  IF selected_product.ownership = 'seller' THEN
    IF selected_product.seller_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.sellers
      WHERE id = selected_product.seller_id AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Seller is not active';
    END IF;
    SELECT commission_percent INTO selected_share
    FROM public.sellers
    WHERE id = selected_product.seller_id;
  END IF;

  new.seller_id := selected_product.seller_id;
  new.ownership := selected_product.ownership;
  new.product_name := selected_product.name;
  new.sku := selected_product.sku;
  new.unit_price := selected_product.price;

  item_gross := new.unit_price * new.quantity;
  item_base_cost := coalesce(selected_product.cost_of_goods, 0) * new.quantity;
  IF selected_product.ownership = 'seller' THEN
    item_base_cost := item_base_cost + coalesce(selected_product.inbound_delivery_fee, 0) * new.quantity;
  END IF;
  service_cost := coalesce(selected_product.fulfillment_service_fee, 0) * new.quantity;
  shipping_cost := pg_catalog.ceil(
    (pg_catalog.greatest(coalesce(selected_product.weight_grams, 500), 1) * new.quantity)::numeric / 500
  ) * coalesce(selected_product.gpo_fee_per_500g, 0);
  profit_pool := item_gross - item_base_cost - service_cost - shipping_cost;
  seller_profit := CASE
    WHEN selected_product.ownership = 'seller'
    THEN pg_catalog.round(profit_pool * selected_share / 100, 2)
    ELSE 0
  END;

  new.commission_percent := selected_share;
  new.item_cost := coalesce(selected_product.cost_of_goods, 0) * new.quantity;
  new.inbound_delivery_fee := CASE
    WHEN selected_product.ownership = 'seller'
    THEN coalesce(selected_product.inbound_delivery_fee, 0) * new.quantity
    ELSE 0
  END;
  new.fulfillment_service_fee := service_cost;
  new.gpo_fee := shipping_cost;
  new.seller_profit_amount := seller_profit;
  new.seller_payout_total := CASE
    WHEN selected_product.ownership = 'seller'
    THEN item_base_cost + seller_profit
    ELSE 0
  END;
  new.payout_status := 'not_due'::public.payout_status;
  IF selected_product.ownership = 'seller' AND new.fulfillment_status = 'unassigned' THEN
    new.fulfillment_status := 'assigned';
  END IF;

  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION private.sync_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  mapped_fulfillment public.fulfillment_status;
  mapped_package public.package_status;
BEGIN
  UPDATE public.seller_order_feed
  SET order_status = new.status, updated_at = now()
  WHERE order_item_id IN (
    SELECT id FROM public.order_items WHERE order_id = new.id
  );

  IF new.status = 'cancelled' AND new.payment_status <> 'unpaid' THEN
    UPDATE public.order_items
    SET payout_status = 'held'::public.payout_status
    WHERE order_id = new.id
      AND seller_id IS NOT NULL
      AND payout_status IN ('not_due'::public.payout_status, 'due'::public.payout_status, 'scheduled'::public.payout_status);
  ELSIF new.payment_status IN ('refunded'::public.payment_status, 'partially_refunded'::public.payment_status) THEN
    UPDATE public.order_items
    SET payout_status = 'held'::public.payout_status
    WHERE order_id = new.id
      AND seller_id IS NOT NULL
      AND payout_status IN ('not_due'::public.payout_status, 'due'::public.payout_status, 'scheduled'::public.payout_status);
  ELSIF new.payment_status = 'paid'::public.payment_status THEN
    UPDATE public.order_items
    SET payout_status = 'due'::public.payout_status
    WHERE order_id = new.id
      AND seller_id IS NOT NULL
      AND payout_status = 'not_due'::public.payout_status;
  END IF;

  mapped_fulfillment := CASE new.status
    WHEN 'new' THEN 'unassigned'::public.fulfillment_status
    WHEN 'confirmed' THEN 'assigned'::public.fulfillment_status
    WHEN 'packing' THEN 'packing'::public.fulfillment_status
    WHEN 'shipped' THEN 'shipped'::public.fulfillment_status
    WHEN 'delivered' THEN 'delivered'::public.fulfillment_status
    WHEN 'cancelled' THEN 'cancelled'::public.fulfillment_status
    WHEN 'returned' THEN 'returned'::public.fulfillment_status
  END;

  UPDATE public.fulfillments
  SET status = mapped_fulfillment
  WHERE order_id = new.id AND status IS DISTINCT FROM mapped_fulfillment;

  UPDATE public.order_items
  SET fulfillment_status = mapped_fulfillment
  WHERE order_id = new.id AND fulfillment_status IS DISTINCT FROM mapped_fulfillment;

  mapped_package := CASE new.status
    WHEN 'packing' THEN 'packed'::public.package_status
    WHEN 'shipped' THEN 'outbound_shipped'::public.package_status
    WHEN 'delivered' THEN 'delivered'::public.package_status
    WHEN 'cancelled' THEN 'cancelled'::public.package_status
    WHEN 'returned' THEN 'returned'::public.package_status
    ELSE NULL
  END;

  IF mapped_package IS NOT NULL THEN
    UPDATE public.outbound_shipments
    SET status = mapped_package
    WHERE order_id = new.id AND status IS DISTINCT FROM mapped_package;

    UPDATE public.inbound_packages
    SET status = mapped_package
    WHERE order_id = new.id AND status IS DISTINCT FROM mapped_package;
  END IF;

  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION private.enforce_seller_payout_payment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  customer_payment public.payment_status;
  order_status public.order_status;
BEGIN
  IF new.seller_id IS NULL THEN
    IF new.payout_status <> 'not_due'::public.payout_status THEN
      RAISE EXCEPTION 'OVERSTOCK inventory has no seller payout';
    END IF;
    RETURN new;
  END IF;

  SELECT payment_status, status INTO customer_payment, order_status
  FROM public.orders
  WHERE id = new.order_id;

  IF new.payout_status IN (
    'due'::public.payout_status,
    'scheduled'::public.payout_status,
    'paid'::public.payout_status
  ) AND (customer_payment <> 'paid'::public.payment_status OR order_status = 'cancelled'::public.order_status) THEN
    RAISE EXCEPTION 'Seller payout requires a completed customer payment and an active order';
  END IF;

  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS zzz_enforce_order_item_payout_guard ON public.order_items;
CREATE TRIGGER zzz_enforce_order_item_payout_guard
BEFORE INSERT OR UPDATE OF payout_status ON public.order_items
FOR EACH ROW EXECUTE FUNCTION private.enforce_seller_payout_payment();

UPDATE public.order_items oi
SET payout_status = CASE
  WHEN o.status = 'cancelled' OR o.payment_status IN ('refunded', 'partially_refunded')
    THEN 'held'::public.payout_status
  WHEN o.payment_status = 'paid'
    THEN 'due'::public.payout_status
  ELSE 'not_due'::public.payout_status
END
FROM public.orders o
WHERE oi.order_id = o.id
  AND oi.seller_id IS NOT NULL;
