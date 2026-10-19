import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const cooldowns = new Map<string, number>();
const RESET_MESSAGE = "If an account is registered with that email, a password reset link will be sent. Check your inbox for the secure link to choose a new password.";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isRateLimited(key: string, now: number) {
  const nextAllowedAt = cooldowns.get(key) || 0;
  if (nextAllowedAt > now) return true;
  cooldowns.set(key, now + 30_000);
  if (cooldowns.size > 2_000) {
    for (const [storedKey, allowedAt] of cooldowns) {
      if (allowedAt <= now) cooldowns.delete(storedKey);
    }
  }
  return false;
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== requestUrl.origin) {
    return NextResponse.json({ error: "Request not allowed." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  if (isRateLimited(`ip:${ip}`, now) || isRateLimited(`email:${email}`, now)) {
    return NextResponse.json({ error: "Wait a moment before requesting another reset link." }, { status: 429 });
  }

  const apiKey = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;
  const senderEmail = process.env.MAILJET_SENDER_EMAIL;
  const senderName = process.env.MAILJET_SENDER_NAME || "OVERSTOCK";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serverKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apiKey || !secretKey || !senderEmail || !supabaseUrl || !serverKey) {
    console.error("OVERSTOCK password reset email is not configured", {
      mailjet: Boolean(apiKey && secretKey && senderEmail),
      supabaseAdmin: Boolean(supabaseUrl && serverKey),
    });
    return NextResponse.json({ error: "Password reset email is not available right now. Try again shortly." }, { status: 503 });
  }

  const adminClient = createSupabaseClient(supabaseUrl, serverKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  // Send users directly to the password form after Supabase validates the
  // one-time recovery link. The callback route is for PKCE links and can
  // otherwise send an admin-generated recovery link back to the login page.
  const resetUrl = new URL("/portal/new-password", requestUrl.origin).toString();
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: resetUrl },
  });

  if (error || !data.properties?.action_link) {
    const notFound = error?.code === "user_not_found" || /user.*not found|email.*not found/i.test(error?.message || "");
    if (notFound) {
      // Keep the response identical for known and unknown email addresses.
      return NextResponse.json({ ok: true, message: RESET_MESSAGE });
    }
    console.error("OVERSTOCK password recovery link generation failed", {
      code: error?.code || "action_link_missing",
      status: error?.status,
    });
    return NextResponse.json({ error: "Password reset email could not be sent right now. Try again shortly." }, { status: 502 });
  }

  const safeLink = escapeHtml(data.properties.action_link);
  const safeEmail = escapeHtml(email);
  const baseUrl = requestUrl.origin;
  const termsUrl = escapeHtml(new URL("/legal/terms", baseUrl).toString());
  const privacyUrl = escapeHtml(new URL("/legal/privacy", baseUrl).toString());
  const shippingUrl = escapeHtml(new URL("/legal/shipping", baseUrl).toString());
  const instagramUrl = escapeHtml(process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/overstock.bd/");
  const facebookUrl = escapeHtml(process.env.NEXT_PUBLIC_FACEBOOK_URL || "#");
  const instagramIcon = escapeHtml(new URL("/email/social/instagram.png", baseUrl).toString());
  const facebookIcon = escapeHtml(new URL("/email/social/facebook.png", baseUrl).toString());
  const emailIcon = escapeHtml(new URL("/email/social/gmail.png", baseUrl).toString());
  const textContent = [
    "OVERSTOCK PASSWORD RESET",
    "",
    "A request was received to reset the password for your OVERSTOCK portal account.",
    "Use this secure link to choose a new password:",
    data.properties.action_link,
    "",
    "If you did not request a password reset, you can ignore this email.",
    `This request was made for ${email}.`,
    "For any queries about your account, contact us at operations.overstock@gmail.com.",
  ].join("\n");
  const htmlContent = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OVERSTOCK Password Reset</title></head><body style="margin:0;padding:24px 14px;background:#f1f1ef;color:#111;font:14px/1.55 Arial,Helvetica,sans-serif"><main style="max-width:650px;margin:0 auto;border:1px solid #111;background:#f1f1ef"><header style="padding:19px 14px;background:#111;color:#f1f1ef;text-align:center;font-size:23px;font-weight:800;letter-spacing:.18em">OVERSTOCK</header><section style="padding:32px 42px 28px;text-align:center"><span style="display:inline-block;padding:7px 18px;border:1px solid #111;border-radius:999px;background:#111;color:#f1f1ef;font-size:10px;font-weight:700;letter-spacing:.11em">ACCOUNT SECURITY</span><h1 style="margin:21px 0 10px;font-size:24px;line-height:1.2">RESET YOUR PASSWORD</h1><p style="margin:0 0 22px">A request was received to reset the password for your OVERSTOCK portal account.</p><p style="margin:0 0 12px;font-size:12px">Select below to choose a new password.</p><p style="margin:0 0 16px"><a href="${safeLink}" style="display:inline-block;min-width:205px;padding:12px 22px;border:1px solid #111;border-radius:999px;background:#111;color:#f1f1ef;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.11em">RESET PASSWORD</a></p><p style="margin:0;font-size:12px;overflow-wrap:anywhere">If the button does not work, open this link:<br><a href="${safeLink}" style="color:#111">${safeLink}</a></p><p style="margin:18px 0 0;padding:12px;border:1px solid #c8c8c4;border-radius:8px;background:#e4e4e0;font-size:12px">If you did not request a password reset, you can ignore this email.</p><p style="margin:13px 0 0;font-size:11px">ACCOUNT EMAIL<br><strong>${safeEmail}</strong></p><p style="margin:14px 0 0;font-size:12px">Need help with your account?<br>For any queries about your account, <a href="mailto:operations.overstock@gmail.com" style="color:#111;font-weight:700">contact us</a>.</p></section><footer style="display:flex;justify-content:center;gap:24px;padding:13px 10px;border-top:1px solid #111;border-bottom:1px solid #111;background:#e4e4e0;font-size:10px;font-weight:700"><a href="${instagramUrl}" style="color:#111;text-decoration:none"><img src="${instagramIcon}" width="16" height="16" alt="Instagram" style="vertical-align:middle;border:0"> &nbsp; INSTAGRAM</a><a href="${facebookUrl}" style="color:#111;text-decoration:none"><img src="${facebookIcon}" width="16" height="16" alt="Facebook" style="vertical-align:middle;border:0"> &nbsp; FACEBOOK</a><a href="mailto:operations.overstock@gmail.com" style="color:#111;text-decoration:none"><img src="${emailIcon}" width="16" height="16" alt="Email" style="vertical-align:middle;border:0"> &nbsp; EMAIL</a></footer><div style="display:flex;justify-content:space-between;gap:12px;padding:12px 17px;font-size:11px"><strong style="white-space:nowrap">© 2026 OVERSTOCK</strong><span style="text-align:right;white-space:nowrap"><a href="${termsUrl}" style="color:#111;text-decoration:none">Terms</a> &nbsp;·&nbsp; <a href="${privacyUrl}" style="color:#111;text-decoration:none">Privacy</a> &nbsp;·&nbsp; <a href="${shippingUrl}" style="color:#111;text-decoration:none">Shipping</a></span></div></main></body></html>`;

  let response: Response;
  try {
    response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${apiKey}:${secretKey}`).toString("base64")}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        Messages: [{
          From: { Name: senderName, Email: senderEmail },
          To: [{ Email: email }],
          Subject: "Reset your OVERSTOCK portal password",
          TextPart: textContent,
          HTMLPart: htmlContent,
        }],
      }),
    });
  } catch (sendError) {
    console.error("OVERSTOCK password reset email request failed before a response", {
      error: sendError instanceof Error ? sendError.name : "unknown",
    });
    return NextResponse.json({ error: "Password reset email could not be sent right now. Try again shortly." }, { status: 502 });
  }

  const mailjetResult = await response.json().catch(() => null) as {
    ErrorMessage?: string;
    Messages?: Array<{ Status?: string; To?: Array<{ MessageID?: string }> }>;
  } | null;
  if (!response.ok) {
    console.error("OVERSTOCK password reset email rejected by Mailjet", {
      status: response.status,
      message: mailjetResult?.ErrorMessage || "provider_error",
    });
    return NextResponse.json({ error: "Password reset email could not be sent right now. Try again shortly." }, { status: 502 });
  }

  console.info("OVERSTOCK password reset email accepted by Mailjet", {
    messageId: mailjetResult?.Messages?.[0]?.To?.[0]?.MessageID || "not_returned",
  });
  return NextResponse.json({ ok: true, message: RESET_MESSAGE });
}
