import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { sendNextBrevoOrderConfirmation } from "@/lib/brevo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("x-square-hmacsha256-signature");
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl = process.env.SQUARE_WEBHOOK_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!signature || !signatureKey || !notificationUrl || !supabaseUrl || !serviceRoleKey) {
    console.warn("[square-webhook] request reached the app, but required configuration is missing.", {
      signaturePresent: Boolean(signature),
      signatureKeyConfigured: Boolean(signatureKey),
      notificationUrlConfigured: Boolean(notificationUrl),
      supabaseUrlConfigured: Boolean(supabaseUrl),
      serviceRoleKeyConfigured: Boolean(serviceRoleKey),
    });
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
    let notificationEndpoint = "invalid";
    try {
      const parsedUrl = new URL(notificationUrl);
      notificationEndpoint = parsedUrl.origin + parsedUrl.pathname;
    } catch {
      // Do not print the configured value because it may contain a bypass token.
    }
    console.warn("[square-webhook] request reached the app, but Square signature validation failed.", {
      notificationEndpoint,
      signatureLength: received.length,
      expectedSignatureLength: expected.length,
    });
    return new Response("Invalid signature.", { status: 401 });
  }

  let event: {
    event_id?: string;
    type?: string;
    data?: { object?: unknown };
  };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return new Response("Invalid event body.", { status: 400 });
  }
  if (!event.type || ![
    "payment.created",
    "payment.updated",
    "refund.created",
    "refund.updated",
  ].includes(event.type)) {
    return new Response(null, { status: 200 });
  }

  const sb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await sb.rpc("process_square_webhook_event", {
    square_event: event,
  });
  if (error) {
    console.error("[square-webhook] event could not be processed", {
      eventType: event.type,
      eventIdPresent: Boolean(event.event_id),
      code: error.code,
    });
    return new Response("Could not process Square event.", { status: 500 });
  }

  try {
    await sendNextBrevoOrderConfirmation(sb, new URL(notificationUrl).origin);
  } catch (emailError) {
    console.error("[square-webhook] Brevo order email delivery failed", {
      eventType: event.type,
      message: emailError instanceof Error ? emailError.message : "unknown error",
    });
    return new Response("Payment processed; order email will be retried.", { status: 500 });
  }
  return new Response(null, { status: 200 });
}
