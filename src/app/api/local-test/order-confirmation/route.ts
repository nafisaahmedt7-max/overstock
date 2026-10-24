import { NextResponse } from "next/server";
import { renderOverstockEmail } from "@/lib/email/overstock-layout";
import { sendToLocalMailpit } from "@/lib/email/mailpit";

type ReceiptItem = { slug: string; name: string; size: string; quantity: number; price: number; imageUrl: string | null };
type CheckoutCustomer = {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseImageUrl(value: unknown, baseUrl: string) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const imageUrl = new URL(value.trim(), baseUrl);
    const localHttp = imageUrl.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(imageUrl.hostname);
    return imageUrl.protocol === "https:" || localHttp ? imageUrl.toString() : null;
  } catch {
    return null;
  }
}

function parseItems(value: unknown, baseUrl: string): ReceiptItem[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) return null;
  const items: ReceiptItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const item = entry as Record<string, unknown>;
    const slug = typeof item.slug === "string" ? item.slug.trim() : "";
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const size = typeof item.size === "string" ? item.size.trim() : "";
    const quantity = Number(item.quantity);
    const price = Number(item.price);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !name || name.length > 120 || !size || size.length > 32) return null;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) return null;
    if (!Number.isFinite(price) || price < 0 || price > 100_000) return null;
    items.push({ slug, name, size, quantity, price, imageUrl: parseImageUrl(item.imageUrl, baseUrl) });
  }
  return items;
}

function readText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parseCustomer(value: unknown): CheckoutCustomer | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const phoneCountryCode = readText(raw.phoneCountryCode, 5);
  const phoneNumber = readText(raw.phone, 32);
  const hasPhoneNumber = phoneNumber.length > 0;
  if (phoneCountryCode && !/^\+[1-9]\d{0,4}$/.test(phoneCountryCode)) return null;
  if (hasPhoneNumber && !/^[+\d().\s-]+$/.test(phoneNumber)) return null;
  const customer = {
    fullName: readText(raw.fullName, 100),
    email: readText(raw.email, 254).toLowerCase(),
    phone: hasPhoneNumber
      ? [phoneCountryCode, phoneNumber].filter(Boolean).join(" ")
      : "",
    addressLine1: readText(raw.addressLine1, 120),
    addressLine2: readText(raw.addressLine2, 120),
    city: readText(raw.city, 80),
    region: readText(raw.region, 80),
    postalCode: readText(raw.postalCode, 24),
    country: readText(raw.country, 80),
  };
  if (
    !customer.fullName ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) ||
    !customer.addressLine1 ||
    !customer.city ||
    !customer.region ||
    !customer.postalCode ||
    !customer.country
  ) return null;
  return customer;
}

function missingCustomerFields(value: unknown) {
  if (!value || typeof value !== "object") {
    return ["full name", "email address", "address line 1", "city", "state / region", "postal code", "country"];
  }
  const raw = value as Record<string, unknown>;
  const required: Array<[string, number]> = [
    ["fullName", 100],
    ["email", 254],
    ["addressLine1", 120],
    ["city", 80],
    ["region", 80],
    ["postalCode", 24],
    ["country", 80],
  ];
  const labels = ["full name", "email address", "address line 1", "city", "state / region", "postal code", "country"];
  return required.flatMap(([key, maxLength], index) =>
    readText(raw[key], maxLength) ? [] : [labels[index]],
  );
}

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

export async function POST(request: Request) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.EMAIL_PROVIDER !== "mailpit"
  ) {
    return NextResponse.json({ error: "Local receipt preview is available only with Mailpit in development." }, { status: 404 });
  }

  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) {
    return NextResponse.json({ error: "Request not allowed." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const items = parseItems(body.items, url.origin);
  const missingFields = missingCustomerFields(body.customer);
  if (missingFields.length) {
    return NextResponse.json({
      error: `Complete required fields: ${missingFields.join(", ")}.`,
    }, { status: 400 });
  }
  const customer = parseCustomer(body.customer);
  if (!items || !customer) {
    return NextResponse.json({ error: "Enter valid order items and delivery details, then try again." }, { status: 400 });
  }

  const orderNumber = `OS-${Date.now().toString().slice(-8)}`;
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const baseUrl = url.origin;
  const shopUrl = escapeHtml(new URL("/", baseUrl).toString());
  const safeOrderNumber = escapeHtml(orderNumber);
  const firstName = escapeHtml(customer.fullName.trim().split(/\s+/)[0].toUpperCase());
  const addressLines = [
    customer.fullName,
    customer.addressLine1,
    customer.addressLine2,
    [customer.city, customer.region, customer.postalCode].filter(Boolean).join(" "),
    customer.country,
  ].filter(Boolean);
  const safeAddressHtml = addressLines.map(escapeHtml).join("<br>");
  const safeContactHtml = [customer.email, customer.phone].filter(Boolean).map(escapeHtml).join("<br>");
  const addressText = addressLines.join("\n");
  const contactText = [customer.email, customer.phone].filter(Boolean).join("\n");
  const itemRows = items.map((item, index) => {
    const productUrl = escapeHtml(new URL(`/product/${encodeURIComponent(item.slug)}`, baseUrl).toString());
    const productImage = item.imageUrl
      ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" width="88" height="96" style="display:block;width:88px;height:96px;object-fit:contain;border:0;background:#f1f1ef;">`
      : `<span style="display:block;width:88px;height:96px;background:#f1f1ef;color:#777;font-family:Arial,Helvetica,sans-serif;font-size:9px;line-height:96px;text-align:center;letter-spacing:.08em;">OVERSTOCK</span>`;
    return `
    <tr>
      <td colspan="2" style="padding:0 2%;${index < items.length - 1 ? "border-bottom:1px solid #c8c8c4;" : ""}">
        <table role="presentation" width="100%" align="center" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          <tr>
            <td width="104" valign="middle" style="width:104px;padding:14px 16px 14px 0;"><a href="${productUrl}" style="display:block;text-decoration:none;">${productImage}</a></td>
            <td valign="middle" style="padding:14px 12px 14px 0;font-family:Arial,Helvetica,sans-serif;">
              <a href="${productUrl}" style="color:#111;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;line-height:1.4;text-decoration:none;text-transform:uppercase;">${escapeHtml(item.name)}</a>
              <div style="margin-top:5px;color:#555;font-size:11px;line-height:1.4;letter-spacing:.04em;">SIZE ${escapeHtml(item.size.toUpperCase())} &nbsp;·&nbsp; QTY ${item.quantity}</div>
            </td>
            <td width="92" align="right" valign="middle" style="width:92px;padding:14px 0 14px 8px;color:#111;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;line-height:1.4;white-space:nowrap;">${money(item.price * item.quantity)}</td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join("");

  const textContent = [
    "ORDER CONFIRMATION",
    `THANK YOU, ${customer.fullName.trim().split(/\s+/)[0].toUpperCase()}`,
    "YOUR ORDER IS CONFIRMED AND IS BEING PREPARED FOR SHIPPING.",
    "",
    `ORDER NUMBER: ${orderNumber}`,
    "DELIVERY ADDRESS:",
    addressText,
    "CONTACT:",
    contactText,
    "ORDER SUMMARY",
    ...items.map((item) => `${item.name} · SIZE ${item.size} · QTY ${item.quantity} · ${money(item.price * item.quantity)}`),
    `ITEM TOTAL: ${money(total)}`,
    "DELIVERY: Calculated at checkout",
    "TAXES: Calculated at checkout\\n(ALL AMOUNTS SHOWN IN USD)",
    `ORDER TOTAL: ${money(total)}`,
    "CLICK BELOW TO CONTINUE SHOPPING",
    `CONTINUE SHOPPING: ${shopUrl}`,
    "Need help with your order? For any queries about your purchase or delivery, contact us.",
    "SHIPPING CONFIRMATION WILL BE SENT TO YOUR EMAIL AFTER DISPATCH.",
  ].join("\n");

  const contentHtml = `
    <p style="margin:0 0 17px;"><span style="display:inline-block;padding:7px 18px;border:1px solid #111;border-radius:999px;background:#111;color:#f1f1ef;font-size:10px;font-weight:700;letter-spacing:.11em;">ORDER CONFIRMATION</span></p>
    <h1 style="margin:20px 0 10px;font-size:24px;line-height:1.2;">THANK YOU, ${firstName}</h1>
    <p style="margin:0 0 4px;color:#555;font-family:'Geist Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;font-weight:500;line-height:1.5;letter-spacing:.04em;text-transform:uppercase;">YOUR ORDER IS CONFIRMED AND IS BEING PREPARED FOR SHIPPING.</p>
    <!--OVERSTOCK_FULL_WIDTH_SECTION-->
    <p style="margin:14px 0 7px;font-size:10px;font-weight:700;letter-spacing:.1em;">CLICK BELOW TO CONTINUE SHOPPING</p>
    <p style="margin:0;"><a class="os-button" href="${shopUrl}" style="display:inline-block;min-width:205px;padding:12px 22px;border:1px solid #111;border-radius:999px;background:#111;color:#f1f1ef;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.11em;">CONTINUE SHOPPING</a></p>
    <p style="margin:14px 0 0;font-size:11px;line-height:1.45;">Need help with your order? For any queries about your purchase or delivery, <a href="mailto:operations.overstock@gmail.com" style="color:#111;font-weight:700;text-decoration:underline;">contact us</a>.</p>
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;margin:12px 0 0;border-collapse:separate;border-spacing:0;background:#e4e4e0;border:1px solid #c8c8c4;border-radius:8px;">
      <tr><td align="center" style="padding:12px 14px;font-size:12px;line-height:1.5;font-weight:600;">
        <span aria-hidden="true" style="display:inline-block;width:18px;height:18px;margin-right:8px;border:1px solid #777;border-radius:50%;color:#555;font-size:12px;line-height:18px;font-weight:700;vertical-align:middle;">i</span>
        <span style="vertical-align:middle;font-size:11px;">SHIPPING CONFIRMATION WILL BE SENT TO YOUR EMAIL AFTER DISPATCH.</span>
      </td></tr>
    </table>
    `;

  const fullWidthHtml = `
    <table class="os-receipt" role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;text-align:left;">
      <tr><td colspan="2" height="32" style="height:32px;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td colspan="2" style="padding:13px 42px;border-top:1px solid #111;border-bottom:1px solid #111;background:#e4e4e0;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:12px;font-weight:700;letter-spacing:.08em;">ORDER NUMBER</td>
          <td align="right" style="font-size:14px;font-weight:700;"><span style="display:inline-block;padding:7px 17px;border:1px solid #111;border-radius:999px;background:#f1f1ef;color:#111;">${safeOrderNumber}</span></td>
        </tr></table>
      </td></tr>
      <tr class="os-receipt-columns">
        <td width="50%" valign="top" style="width:50%;padding:14px 21px 16px 42px;border-bottom:1px solid #111;">
          <p style="margin:0 0 9px;padding-bottom:7px;border-bottom:1px solid #111;font-size:10px;font-weight:700;letter-spacing:.1em;">DELIVERY ADDRESS</p>
          <p style="margin:0;color:#555;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:400;line-height:1.5;">${safeAddressHtml}</p>
        </td>
        <td width="50%" valign="top" style="width:50%;padding:14px 42px 16px 21px;border-bottom:1px solid #111;border-left:1px solid #111;">
          <p style="margin:0 0 9px;padding-bottom:7px;border-bottom:1px solid #111;font-size:10px;font-weight:700;letter-spacing:.1em;">CONTACT</p>
          <p style="margin:0;color:#555;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:400;line-height:1.5;">${safeContactHtml}</p>
        </td>
      </tr>
      <tr><td colspan="2" style="padding:14px 42px 15px;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          <tr><td colspan="2" align="center" style="padding:0 0 7px;border-bottom:1px solid #111;text-align:center;font-size:10px;font-weight:700;letter-spacing:.1em;">ORDER SUMMARY</td></tr>
          <tr><td colspan="2" style="height:8px;font-size:8px;line-height:8px;">&nbsp;</td></tr>
          ${itemRows}
          <tr><td colspan="2" style="padding:0;">
            <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;">
              <tr><td colspan="2" height="1" style="height:1px;padding-top:9px;border-top:1px solid #111;font-size:0;line-height:0;">&nbsp;</td></tr>
              <tr><td style="padding:5px 2% 4px;border-bottom:1px solid #c8c8c4;color:#555;">ITEM TOTAL</td><td align="right" style="padding:5px 2% 4px;border-bottom:1px solid #c8c8c4;font-size:12px;font-weight:700;white-space:nowrap;">${money(total)}</td></tr>
              <tr><td style="padding:4px 2%;border-bottom:1px solid #c8c8c4;color:#555;">DELIVERY</td><td align="right" style="padding:4px 2%;border-bottom:1px solid #c8c8c4;color:#555;">Calculated at checkout</td></tr>
              <tr><td style="padding:4px 2% 10px;border-bottom:1px solid #111;color:#555;">TAXES</td><td align="right" style="padding:4px 2% 10px;border-bottom:1px solid #111;color:#555;">Calculated at checkout<br><span style="font-size:8px;font-style:italic;font-weight:700;letter-spacing:.04em;color:#666;white-space:nowrap;">(ALL AMOUNTS SHOWN IN USD)</span></td></tr>
                            <tr><td colspan="2" style="padding:10px 0 0;">
                <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:0 2% 10px;font-size:16px;font-weight:700;letter-spacing:.08em;">ORDER TOTAL</td><td align="right" style="padding:0 2% 10px;font-size:16px;font-weight:700;line-height:1.4;white-space:nowrap;">${money(total)}</td></tr>
                </table>
                <div style="border-top:1px solid #111;font-size:0;line-height:0;">&nbsp;</div>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
    </table>`;

  const htmlContent = renderOverstockEmail(baseUrl, contentHtml, fullWidthHtml);
  try {
    const mailpitResponse = await sendToLocalMailpit({
      fromEmail: process.env.MAILPIT_FROM_EMAIL || "no-reply@overstock.local",
      fromName: "OVERSTOCK",
      toEmail: customer.email,
      toName: customer.fullName,
      subject: `OVERSTOCK ORDER CONFIRMATION · ${orderNumber}`,
      text: textContent,
      html: htmlContent,
    });
    if (!mailpitResponse.ok) {
      throw new Error(`Mailpit returned HTTP ${mailpitResponse.status}.`);
    }
  } catch (error) {
    console.error("Local order confirmation email could not be captured by Mailpit", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Mailpit is unavailable. Start Mailpit and try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, orderNumber });
}
