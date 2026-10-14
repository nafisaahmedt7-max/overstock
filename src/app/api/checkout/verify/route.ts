import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type SquareOrderResponse = {
  order?: { id?: string; tenders?: Array<{ id?: string }> };
};

type SquarePaymentResponse = {
  payment?: { id?: string; order_id?: string; status?: string };
};

export async function GET(request: Request) {
  const orderNumber = new URL(request.url).searchParams.get("order");
  if (!orderNumber || !/^\\d{1,12}$/.test(orderNumber)) {
    return Response.json({ error: "Invalid order number." }, { status: 400 });
  }

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const environment = process.env.SQUARE_ENVIRONMENT || "sandbox";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!accessToken || !supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Payment verification is not configured." }, { status: 503 });
  }

  const sb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: order, error: lookupError } = await sb
    .from("orders")
    .select("id,order_number,square_order_id,payment_status")
    .eq("order_number", Number(orderNumber))
    .maybeSingle();

  if (lookupError) return Response.json({ error: "Could not look up this order." }, { status: 500 });
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
  if (order.payment_status === "paid") return Response.json({ status: "paid" });
  if (!order.square_order_id) return Response.json({ status: "pending" });

  const squareBase = environment === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
  const squareHeaders = {
    Authorization: "Bearer " + accessToken,
    "Square-Version": "2026-09-16",
  };

  const orderResponse = await fetch(
    squareBase + "/v2/orders/" + encodeURIComponent(order.square_order_id),
    { headers: squareHeaders, cache: "no-store" },
  );
  if (!orderResponse.ok) {
    return Response.json({ error: "Square has not confirmed the order yet." }, { status: 503 });
  }

  const squareOrder = (await orderResponse.json()) as SquareOrderResponse;
  const tenderIds = (squareOrder.order?.tenders || [])
    .map((tender) => tender.id)
    .filter((id): id is string => Boolean(id));

  for (const tenderId of tenderIds) {
    const paymentResponse = await fetch(
      squareBase + "/v2/payments/" + encodeURIComponent(tenderId),
      { headers: squareHeaders, cache: "no-store" },
    );
    if (!paymentResponse.ok) continue;

    const result = (await paymentResponse.json()) as SquarePaymentResponse;
    const payment = result.payment;
    if (
      payment?.id &&
      payment.order_id === order.square_order_id &&
      payment.status === "COMPLETED"
    ) {
      const { error: updateError } = await sb
        .from("orders")
        .update({ square_payment_id: payment.id, payment_status: "paid" })
        .eq("id", order.id);
      if (updateError) {
        return Response.json({ error: "Square confirmed payment but the order could not be updated." }, { status: 500 });
      }
      return Response.json({ status: "paid" });
    }
  }

  return Response.json({ status: "pending" });
}
