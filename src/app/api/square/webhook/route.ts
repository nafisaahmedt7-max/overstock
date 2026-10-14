import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("x-square-hmacsha256-signature");
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl = process.env.SQUARE_WEBHOOK_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!signature || !signatureKey || !notificationUrl || !supabaseUrl || !serviceRoleKey) {
    return new Response("Webhook is not configured.", { status: 500 });
  }

  const rawBody = await request.text();
  const expected = createHmac("sha256", signatureKey)
    .update(notificationUrl + rawBody)
    .digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, "base64");
  } catch {
    return new Response("Invalid signature.", { status: 401 });
  }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return new Response("Invalid signature.", { status: 401 });
  }

  let event: {
    type?: string;
    data?: { object?: { payment?: { id?: string; order_id?: string; status?: string } } };
  };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return new Response("Invalid event body.", { status: 400 });
  }
  if (event.type !== "payment.created" && event.type !== "payment.updated") {
    return new Response(null, { status: 200 });
  }
  const payment = event.data?.object?.payment;
  if (!payment?.order_id) return new Response(null, { status: 200 });

  const sb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const update: Record<string, unknown> = {};
  if (payment.id) update.square_payment_id = payment.id;
  if (payment.status === "COMPLETED") update.payment_status = "paid";
  if (Object.keys(update).length) {
    const { error } = await sb.from("orders").update(update).eq("square_order_id", payment.order_id);
    if (error) return new Response("Could not update order.", { status: 500 });
  }
  return new Response(null, { status: 200 });
}
