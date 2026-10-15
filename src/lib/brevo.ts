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
  delivery_address: string | null;
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

function safeSocialUrl(value: string | undefined, domain: "instagram.com" | "facebook.com") {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || (host !== domain && !host.endsWith(`.${domain}`))) return null;
    return escapeHtml(url.toString());
  } catch {
    return null;
  }
}

function socialIconLink(href: string | null, label: string, icon: string) {
  const content =
    '<span style="display:inline-block;width:34px;height:34px;padding:7px;border:1px solid #050505;border-radius:50%;vertical-align:middle">' +
    icon +
    '</span><span style="display:block;padding-top:6px;font-size:9px;line-height:12px;font-weight:600;letter-spacing:.5px">' +
    label +
    '</span>';
  return href
    ? '<a href="' + href + '" aria-label="' + label + '" style="display:inline-block;color:#050505;text-decoration:none">' + content + '</a>'
    : '<span aria-label="' + label + '" style="display:inline-block;color:#050505">' + content + '</span>';
}

function buildEmailContent(order: QueuedOrderEmail, siteOrigin: string, contactEmail: string) {
  const origin = new URL(siteOrigin).origin;
  const safeName = escapeHtml(order.customer_name);
  const safeAddress = escapeHtml(order.delivery_address || "—");
  const safeOrigin = escapeHtml(origin);
  const safeTerms = escapeHtml(origin + "/legal/terms");
  const safePrivacy = escapeHtml(origin + "/legal/privacy");
  const safeShipping = escapeHtml(origin + "/legal/shipping");
  const instagramUrl = safeSocialUrl(process.env.OVERSTOCK_INSTAGRAM_URL, "instagram.com");
  const facebookUrl = safeSocialUrl(process.env.OVERSTOCK_FACEBOOK_URL, "facebook.com");
  const safeContactEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
    ? escapeHtml(contactEmail)
    : null;
  const instagramIcon = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#050505" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.7" cy="6.5" r=".8" fill="#050505" stroke="none"/></svg>';
  const facebookIcon = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="#050505"><path d="M13.4 21v-8h2.8l.4-3h-3.2V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.4-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H7.2v3h2.8v8z"/></svg>';
  const emailIcon = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#050505" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m4 7 8 6 8-6"/></svg>';
  const socialLinks =
    '<tr><td align="center" style="padding:20px 20px 14px;border-top:1px solid #050505;text-align:center">' +
    '<div style="padding-bottom:14px;font-size:9px;line-height:13px;font-weight:600;letter-spacing:1px">FOLLOW / CONTACT</div>' +
    '<table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0"><tr>' +
    '<td align="center" style="padding:0 10px">' + socialIconLink(instagramUrl, "INSTAGRAM", instagramIcon) + '</td>' +
    '<td align="center" style="padding:0 10px">' + socialIconLink(facebookUrl, "FACEBOOK", facebookIcon) + '</td>' +
    '<td align="center" style="padding:0 10px">' + socialIconLink(safeContactEmail ? "mailto:" + safeContactEmail : null, "EMAIL", emailIcon) + '</td>' +
    '</tr></table></td></tr>';
  const itemRows = order.items.map((item) => {
    const size = item.size
      ? '<div style="padding-top:5px;font-size:12px;line-height:18px">Size ' + escapeHtml(item.size) + "</div>"
      : "";
    return '<tr><td style="padding:14px 0;border-bottom:1px solid #050505;vertical-align:top;font-size:14px;line-height:20px;font-weight:500">' +
      escapeHtml(item.name) + size + '</td><td align="right" style="padding:14px 0 14px 12px;border-bottom:1px solid #050505;vertical-align:top;font-size:14px;line-height:20px">' +
      item.quantity + "</td></tr>";
  }).join("");
  const total = Number(order.total_aud || 0).toFixed(2);
  const html = [
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Order confirmed</title>',
    '<style>@import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&display=swap");</style></head>',
    '<body style="margin:0;padding:0;background:#f1f1ef;color:#050505;font-family:Geist,Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased">',
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0">Your OVERSTOCK order #__ORDER__ is confirmed.</div>',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f1ef;color:#050505;font-family:Geist,Arial,Helvetica,sans-serif"><tr><td align="center" style="padding:24px 14px">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#f1f1ef;border:1px solid #050505;color:#050505">',
    '<tr><td style="padding:24px 30px;background:#050505;color:#f1f1ef"><a href="__STORE_URL__" style="color:#f1f1ef;text-decoration:none;font-family:Geist,Arial,Helvetica,sans-serif;font-size:20px;line-height:24px;font-weight:800;letter-spacing:2px">OVERSTOCK</a></td></tr>',
    '<tr><td style="padding:22px 30px 20px;border-bottom:1px solid #050505"><div style="font-size:10px;line-height:15px;font-weight:700;letter-spacing:1px">DELIVERY ADDRESS</div><p style="margin:7px 0 0;font-size:13px;line-height:21px;overflow-wrap:anywhere">__ADDRESS__</p></td></tr>',
    '<tr><td align="center" style="padding:34px 30px 22px;text-align:center"><div style="display:inline-block;padding:6px 10px;border:1px solid #050505;background:#050505;color:#f1f1ef;font-size:10px;line-height:14px;font-weight:700;letter-spacing:1px">PAYMENT CONFIRMED</div>',
    '<h1 style="margin:18px 0 9px;font-family:Geist,Arial,Helvetica,sans-serif;font-size:29px;line-height:36px;letter-spacing:-.6px;font-weight:600;color:#050505">Thank you, __NAME__.</h1>',
    '<p style="margin:0;font-size:14px;line-height:22px;color:#050505">Your order is confirmed. We’ll email your tracking link as soon as it ships.</p></td></tr>',
    '<tr><td style="padding:0 30px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #050505;border-bottom:1px solid #050505;color:#050505">',
    '<tr><td style="padding:14px 0;border-bottom:1px solid #050505"><div style="font-size:10px;line-height:15px;font-weight:700;letter-spacing:1px">ORDER NUMBER</div><div style="padding-top:4px;font-size:16px;line-height:22px;font-weight:600">#__ORDER__</div></td></tr>',
    '<tr><td style="padding:0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="color:#050505"><tr><td style="padding:13px 0 8px;font-size:10px;line-height:15px;font-weight:700;letter-spacing:1px">ITEM</td><td align="right" style="padding:13px 0 8px;font-size:10px;line-height:15px;font-weight:700;letter-spacing:1px">QTY</td></tr>__ITEMS__',
    '<tr><td style="padding:16px 0;font-size:14px;line-height:20px;font-weight:600">Paid total</td><td align="right" style="padding:16px 0;font-size:15px;line-height:20px;font-weight:700">AUD __TOTAL__</td></tr></table></td></tr></table></td></tr>',

    '<tr><td align="center" style="padding:28px 30px;text-align:center"><p style="margin:0"><a href="__STORE_URL__" style="display:inline-block;padding:11px 18px;background:#050505;color:#f1f1ef;text-decoration:none;font-size:11px;line-height:16px;font-weight:600;letter-spacing:.4px">CONTINUE SHOPPING</a></p></td></tr>',
    socialLinks,
    '<tr><td align="center" style="padding:16px 20px;border-top:1px solid #050505;text-align:center;font-size:10px;line-height:17px"><a href="__TERMS_URL__" style="color:#050505;text-decoration:underline;text-underline-offset:2px">Terms</a><span> &nbsp;·&nbsp; </span><a href="__PRIVACY_URL__" style="color:#050505;text-decoration:underline;text-underline-offset:2px">Privacy</a><span> &nbsp;·&nbsp; </span><a href="__SHIPPING_URL__" style="color:#050505;text-decoration:underline;text-underline-offset:2px">Shipping</a></td></tr>',
    '</table></td></tr></table></body></html>',
  ].join("");
  return html
    .replaceAll("__NAME__", safeName)
    .replaceAll("__ORDER__", String(order.order_number))
    .replaceAll("__STORE_URL__", safeOrigin)
    .replace("__TERMS_URL__", safeTerms)
    .replace("__PRIVACY_URL__", safePrivacy)
    .replace("__SHIPPING_URL__", safeShipping)
    .replace("__ITEMS__", itemRows)
    .replace("__TOTAL__", total)
    .replace("__ADDRESS__", safeAddress);
}

export async function sendNextBrevoOrderConfirmation(supabase: SupabaseClient, siteOrigin: string) {
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
    const content = buildEmailContent(queued, siteOrigin, senderEmail);
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
