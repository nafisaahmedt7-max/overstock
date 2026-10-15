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
  const itemRows = order.items.map((item) => {
    const size = item.size
      ? '<div style="padding-top:5px;color:#73736f;font-size:12px;line-height:18px">Size ' + escapeHtml(item.size) + "</div>"
      : "";
    return '<tr><td style="padding:18px 0;border-bottom:1px solid #e8e6e1;vertical-align:top"><div style="font-size:14px;line-height:20px;font-weight:700;color:#191918">' +
      escapeHtml(item.name) + '</div>' + size + '</td><td align="center" style="padding:18px 10px;border-bottom:1px solid #e8e6e1;vertical-align:top;color:#585853;font-size:13px;line-height:20px">' +
      item.quantity + "</td></tr>";
  }).join("");
  const total = Number(order.total_aud || 0).toFixed(2);
  const html = [
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Order confirmed</title></head>',
    '<body style="margin:0;padding:0;background:#f2f1ed;color:#191918;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased">',
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">Your OVERSTOCK order #__ORDER__ is confirmed. Keep this email for your records.</div>',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2f1ed"><tr><td align="center" style="padding:36px 16px">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#ffffff">',
    '<tr><td style="padding:28px 36px;background:#171715;color:#ffffff"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="font-size:19px;line-height:22px;font-weight:800;letter-spacing:2px">OVERSTOCK</td><td align="right" style="font-size:10px;line-height:16px;letter-spacing:1.4px;color:#d0d0ca">ORDER UPDATE</td></tr></table></td></tr>',
    '<tr><td style="padding:38px 36px 20px"><div style="display:inline-block;padding:7px 11px;border-radius:20px;background:#e8f3eb;color:#27623c;font-size:10px;line-height:14px;font-weight:700;letter-spacing:1px">PAYMENT CONFIRMED</div>',
    '<h1 style="margin:18px 0 10px;font-size:30px;line-height:36px;letter-spacing:-.7px;color:#171715">Thank you, __NAME__.</h1><p style="margin:0;color:#5d5d58;font-size:15px;line-height:24px">Your order is confirmed and being prepared. We’ve received your payment successfully.</p></td></tr>',
    '<tr><td style="padding:8px 36px 26px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f6f5f2;border:1px solid #e8e6e1"><tr><td style="padding:15px 18px;border-bottom:1px solid #e8e6e1"><div style="font-size:10px;line-height:15px;font-weight:700;letter-spacing:1px;color:#777770">ORDER NUMBER</div><div style="padding-top:4px;font-size:16px;line-height:22px;font-weight:700;color:#191918">#__ORDER__</div></td></tr>',
    '<tr><td style="padding:0 18px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding:14px 0 8px;color:#777770;font-size:10px;line-height:15px;font-weight:700;letter-spacing:1px">ITEM</td><td align="center" style="padding:14px 10px 8px;color:#777770;font-size:10px;line-height:15px;font-weight:700;letter-spacing:1px">QTY</td></tr>__ITEMS__<tr><td style="padding:18px 0 20px;font-size:14px;line-height:20px;font-weight:700;color:#191918">Paid total</td><td align="right" colspan="2" style="padding:18px 0 20px;font-size:15px;line-height:20px;font-weight:700;color:#191918">AUD __TOTAL__</td></tr></table></td></tr></table></td></tr>',
    '<tr><td style="padding:0 36px 34px"><p style="margin:0;color:#5d5d58;font-size:13px;line-height:21px">Please keep this email as your receipt. We’ll be in touch if we need anything else to complete your order.</p></td></tr>',
    '<tr><td style="padding:22px 36px;background:#f6f5f2;border-top:1px solid #e8e6e1"><p style="margin:0;color:#66665f;font-size:11px;line-height:18px">OVERSTOCK · Thoughtfully found, ready for its next home.</p><p style="margin:7px 0 0;color:#8a8a83;font-size:10px;line-height:16px">This is an order confirmation for a purchase made with OVERSTOCK.</p></td></tr></table></td></tr></table></body></html>',
  ].join("");
  return html
    .replaceAll("__NAME__", safeName)
    .replaceAll("__ORDER__", String(order.order_number))
    .replace("__ITEMS__", itemRows)
    .replace("__TOTAL__", total);
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
