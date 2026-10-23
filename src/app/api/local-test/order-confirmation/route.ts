import { NextResponse } from "next/server";
import { renderOverstockEmail } from "@/lib/email/overstock-layout";
import { sendToLocalMailpit } from "@/lib/email/mailpit";

type ReceiptItem = { name: string; size: string; quantity: number; price: number };
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

function parseItems(value: unknown): ReceiptItem[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) return null;
  const items: ReceiptItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const item = entry as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const size = typeof item.size === "string" ? item.size.trim() : "";
    const quantity = Number(item.quantity);
    const price = Number(item.price);
    if (!name || name.length > 120 || !size || size.length > 32) return null;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) return null;
    if (!Number.isFinite(price) || price < 0 || price > 100_000) return null;
    items.push({ name, size, quantity, price });
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
  if (phoneCountryCode && !/^\\+[1-9]\\d{0,3}$/.test(phoneCountryCode)) return null;
  if (hasPhoneNumber && !/^[+\\d().\\s-]+$/.test(phoneNumber)) return null;
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
    !["United States", "Australia", "Other"].includes(customer.country)
  ) return null;
  return customer;
}

function money(value: number) {
  return `US$${value.toFixed(2)}`;
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
  const items = parseItems(body.items);
  const customer = parseCustomer(body.customer);
  if (!items || !customer) {
    return NextResponse.json({ error: "Enter valid delivery and contact details, then try again." }, { status: 400 });
  }

  const orderNumber = `OS-${Date.now().toString().slice(-8)}`;
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const baseUrl = url.origin;
  const shopUrl = escapeHtml(new URL("/", baseUrl).toString());
  const safeOrderNumber = escapeHtml(orderNumber);
  const uppercaseSafeName = escapeHtml(customer.fullName.toUpperCase());
  const firstName = escapeHtml(customer.fullName.split(/\s+/)[0]);
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
  const itemRows = items.map((item) => `
    <tr>
      <td style="padding:7px 9px;background:#e7e7e3;font-size:12px;line-height:1.45;">${escapeHtml(item.name)} <span style="color:#555;">· ${escapeHtml(item.size)}</span></td>
      <td align="right" style="padding:7px 9px;background:#e7e7e3;font-size:12px;line-height:1.45;white-space:nowrap;">× ${item.quantity}</td>
    </tr>`).join("");

  const textContent = [
    "ORDER CONFIRMATION · LOCAL TEST",
    `THANK YOU, ${customer.fullName.toUpperCase()}.`,
    `Hello, ${customer.fullName.split(/\s+/)[0]}. Your order confirmation is ready from OVERSTOCK.`,
    "",
    `ORDER NUMBER: ${orderNumber}`,
    "DELIVERY ADDRESS:",
    addressText,
    "CONTACT:",
    contactText,
    "ORDER ITEMS:",
    ...items.map((item) => `${item.name} · ${item.size} × ${item.quantity}`),
    `ORDER TOTAL: ${money(total)}`,
    "Shipping updates will be sent by email once your order has been dispatched.",
    "",
    "LOCAL TEST ONLY. No payment was processed and no live order was created.",
  ].join("\n");

  const contentHtml = `
    <p style="margin:0 0 17px;"><span style="display:inline-block;padding:7px 18px;border:1px solid #111;border-radius:999px;background:#111;color:#f1f1ef;font-size:10px;font-weight:700;letter-spacing:.11em;">ORDER CONFIRMATION · LOCAL TEST</span></p>
    <h1 style="margin:20px 0 10px;font-size:24px;line-height:1.2;">THANK YOU, ${uppercaseSafeName}.</h1>
    <p style="margin:0 0 18px;">Hello, ${firstName}. Your order confirmation is ready from OVERSTOCK.</p>
    <h2 style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:.12em;">DETAILS</h2>
    <!--OVERSTOCK_FULL_WIDTH_SECTION-->
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;margin:14px 0 0;border-collapse:separate;border-spacing:0;background:#e4e4e0;border:1px solid #c8c8c4;border-radius:8px;">
      <tr><td align="center" style="padding:12px 14px;font-size:12px;line-height:1.5;font-weight:600;">
        <span aria-hidden="true" style="display:inline-block;width:18px;height:18px;margin-right:8px;border:1px solid #777;border-radius:50%;color:#555;font-size:12px;line-height:18px;font-weight:700;vertical-align:middle;">i</span>
        <span style="vertical-align:middle;">Shipping updates will be sent by email once your order has been dispatched.</span>
      </td></tr>
    </table>
    <p style="margin:14px 0 0;"><a class="os-button" href="${shopUrl}" style="display:inline-block;min-width:205px;padding:12px 22px;border:1px solid #111;border-radius:999px;background:#111;color:#f1f1ef;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.11em;">CONTINUE SHOPPING</a></p>
    <p style="margin:12px 0 0;font-size:12px;line-height:1.5;"><strong style="display:block;margin-bottom:3px;font-size:13px;">Need help with your order?</strong>For any queries about your purchase or delivery, <a href="mailto:operations.overstock@gmail.com" style="color:#111;font-weight:700;text-decoration:underline;">contact us</a>.</p>
    <p style="margin:16px 0 0;color:#555;font-size:10px;line-height:1.45;">LOCAL TEST ONLY · NO PAYMENT WAS PROCESSED · NO LIVE ORDER WAS CREATED</p>`;

  const fullWidthHtml = `
    <table class="os-receipt" role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;text-align:left;">
      <tr><td colspan="2" style="padding:13px 42px;border-top:1px solid #111;border-bottom:1px solid #111;background:#e4e4e0;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:12px;font-weight:700;letter-spacing:.08em;">ORDER NUMBER</td>
          <td align="right" style="font-size:14px;font-weight:700;">${safeOrderNumber}</td>
        </tr></table>
      </td></tr>
      <tr class="os-receipt-columns">
        <td width="50%" valign="top" style="width:50%;padding:14px 21px 16px 42px;border-bottom:1px solid #111;">
          <p style="margin:0 0 9px;padding-bottom:7px;border-bottom:1px solid #111;font-size:10px;font-weight:700;letter-spacing:.1em;">DELIVERY ADDRESS</p>
          <p style="margin:0;font-size:12px;line-height:1.65;">${safeAddressHtml}</p>
        </td>
        <td width="50%" valign="top" style="width:50%;padding:14px 42px 16px 21px;border-bottom:1px solid #111;border-left:1px solid #111;">
          <p style="margin:0 0 9px;padding-bottom:7px;border-bottom:1px solid #111;font-size:10px;font-weight:700;letter-spacing:.1em;">CONTACT</p>
          <p style="margin:0;font-size:12px;line-height:1.65;">${safeContactHtml}</p>
        </td>
      </tr>
      <tr><td colspan="2" style="padding:14px 42px 15px;border-bottom:1px solid #111;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0 6px;">
          <tr><td style="padding:0 0 7px;border-bottom:1px solid #111;font-size:10px;font-weight:700;letter-spacing:.1em;">ORDER ITEMS</td><td align="right" style="padding:0 0 7px;border-bottom:1px solid #111;font-size:10px;font-weight:700;letter-spacing:.1em;">QTY</td></tr>
          ${itemRows}
        </table>
      </td></tr>
      <tr><td colspan="2" style="padding:12px 42px;border-bottom:1px solid #111;background:#e4e4e0;">
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:12px;font-weight:700;letter-spacing:.08em;">ORDER TOTAL</td>
          <td align="right" style="font-size:16px;font-weight:700;">${money(total)}</td>
        </tr></table>
      </td></tr>
    </table>`;

  const htmlContent = renderOverstockEmail(baseUrl, contentHtml, fullWidthHtml);
  try {
    const mailpitResponse = await sendToLocalMailpit({
      fromEmail: process.env.MAILPIT_FROM_EMAIL || "no-reply@overstock.local",
      fromName: "OVERSTOCK",
      toEmail: customer.email,
      toName: customer.fullName,
      subject: `LOCAL TEST · OVERSTOCK ORDER CONFIRMATION · ${orderNumber}`,
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
