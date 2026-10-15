-- Reject invalid/missing orders and null payment state before a seller payout can be recorded.
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

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seller payout requires a valid order';
  END IF;

  IF new.payout_status IN (
    'due'::public.payout_status,
    'scheduled'::public.payout_status,
    'paid'::public.payout_status
  ) AND (
    customer_payment IS DISTINCT FROM 'paid'::public.payment_status
    OR order_status IS NULL
    OR order_status = 'cancelled'::public.order_status
  ) THEN
    RAISE EXCEPTION 'Seller payout requires a completed customer payment and an active order';
  END IF;

  RETURN new;
END;
$function$;

-- Correct stale ledger rows that predate the payout guard.
UPDATE public.order_items oi
SET payout_status = CASE
  WHEN o.status = 'cancelled' OR o.payment_status IN ('refunded', 'partially_refunded')
    THEN 'held'::public.payout_status
  ELSE 'not_due'::public.payout_status
END
FROM public.orders o
WHERE oi.order_id = o.id
  AND oi.seller_id IS NOT NULL
  AND oi.payout_status IN ('due', 'scheduled', 'paid')
  AND (
    o.payment_status <> 'paid'
    OR o.status = 'cancelled'
    OR o.payment_status IN ('refunded', 'partially_refunded')
  );
