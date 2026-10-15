import type { SupabaseClient } from "@supabase/supabase-js";

type OrderEmailItem = {
  name: string;
  quantity: number;
  size: string | null;
};

type QueuedOrderEmail = {
  notification_id: string;
  email: string;
  customer_name: string;
  order_number: number;
  total_aud: number | null;
  items: OrderEmailItem[];
};

const htmlEscapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => htmlEscapes[character] || character);
}

function buildEmailContent(order: QueuedOrderEmail) {
  const safeName = escapeHtml(order.customer_name);
  const itemsHtml = order.items.map((item) => {
    const size = item.size ? ` — size ${escapeHtml(item.size)}` : "";
    return `<li>${item.quantity} × ${escapeHtml(item.name)}${size}</li>`;
  }).join("");
  const total = Number(order.total_aud || 0).toFixed(2);
  return `<!doctype html><html><body style="margin:0;background:#f5f3ef;padding:32px;font-family:Arial,sans-serif;color:#24231f"><main style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border:1px solid #e5e1d9"><p style="letter-spacing:.16em;font-size:12px;font-weight:bold">OVERSTOCK</p><h1 style="font-size:24px">Order confirmed</h1><p>Hi ${safeName}, your order <strong>#${order.order_number}</strong> is confirmed.</p><ul>${itemsHtml}</ul><p style="border-top:1px solid #e5e1d9;padding-top:16px"><strong>Paid total: AUD ${total}</strong></p><p>Thank you for shopping with OVERSTOCK.</p></main></body></html>`;
}

export async function sendNextBrevoOrderConfirmation(supabase: SupabaseClient) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) {
    console.warn("[brevo] order email is queued; configure BREVO_API_KEY and BREVO_SENDER_EMAIL.");
    return;
  }

  const { data, error } = await supabase.rpc("claim_brevo_order_confirmation");
  if (error) throw new Error("Could not claim Brevo order email.");

  const queued = (Array.isArray(data) ? data[0] : data) as QueuedOrderEmail | null;
  if (!queued) return;

  try {
    const content = buildEmailContent(queued);
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME || "OVERSTOCK",
          email: senderEmail,
        },
        to: [{ email: queued.email, name: queued.customer_name }],
        subject: `Order #${queued.order_number} confirmed — OVERSTOCK`,
        htmlContent: content,
        tags: ["order-confirmation"],
      }),
      signal: AbortSignal.timeout(10000),
    });

    const responseBody = await response.json().catch(() => ({})) as { messageId?: string; message?: string; code?: string };
    if (!response.ok) {
      await supabase.rpc("retry_brevo_order_confirmation", {
        notification_id: queued.notification_id,
        error_message: `Brevo returned HTTP ${response.status}: ${responseBody.code || responseBody.message || "delivery failed"}`,
      });
      throw new Error(`Brevo rejected the order email with HTTP ${response.status}.`);
    }

    const { error: completeError } = await supabase.rpc("complete_brevo_order_confirmation", {
      notification_id: queued.notification_id,
      provider_message_id: responseBody.messageId || "",
    });
    if (completeError) throw new Error("Brevo accepted the email, but the delivery record could not be completed.");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Brevo rejected")) throw error;
    await supabase.rpc("retry_brevo_order_confirmation", {
      notification_id: queued.notification_id,
      error_message: error instanceof Error ? error.message : "Brevo delivery failed",
    });
    throw new Error("Brevo order email delivery failed.");
  }
}
