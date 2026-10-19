import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { renderOverstockEmail } from "@/lib/email/overstock-layout";

const cooldowns = new Map<string, number>();
const RESET_MESSAGE = "**If an account is registered with that email, a password reset link will be sent. Check your mail's INBOX or SPAM for the secure link to choose a new password.**";

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
  // Verify the token on our own origin so preview URLs do not depend on the
  // Supabase Auth redirect allow-list or fall back to its configured Site URL.
  const resetUrl = new URL("/auth/confirm", requestUrl.origin);
  resetUrl.searchParams.set("type", "recovery");
  resetUrl.searchParams.set("next", `/portal/new-password?email=${encodeURIComponent(email)}`);
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (error || !data.properties?.hashed_token) {
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

  resetUrl.searchParams.set("token_hash", data.properties.hashed_token);
  const safeLink = escapeHtml(resetUrl.toString());
  const safeEmail = escapeHtml(email);
  const baseUrl = requestUrl.origin;
  const textContent = [
    "OVERSTOCK PASSWORD RESET",
    "",
    "A request was received to reset the password for your OVERSTOCK portal account.",
    "Use this secure link to choose a new password:",
    resetUrl.toString(),
    "",
    "If you did not request a password reset, you can ignore this email.",
    `This request was made for ${email}.`,
    "For any queries about your account, contact us at operations.overstock@gmail.com.",
  ].join("\n");
  const contentHtml = `
    <p style="margin:0 0 17px;"><span style="display:inline-block;padding:7px 18px;border:1px solid #111111;border-radius:999px;background-color:#111111;color:#f1f1ef;font-size:10px;font-weight:700;letter-spacing:.11em;">ACCOUNT SECURITY</span></p>
    <h1 style="margin:20px 0 10px;font-size:24px;line-height:1.2;">RESET YOUR PASSWORD</h1>
    <p style="margin:0 0 18px;">A request was received to reset the password for your OVERSTOCK portal account.</p>
    <p style="margin:0 0 12px;font-size:12px;">Click below to choose a new password.</p>
    <p style="margin:0 0 16px;"><a class="os-button" href="${safeLink}" style="display:inline-block;min-width:205px;padding:12px 22px;border:1px solid #111111;border-radius:999px;background-color:#111111;color:#f1f1ef;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.11em;transition:background-color .2s ease,color .2s ease,box-shadow .2s ease;">RESET PASSWORD</a></p>
    <p style="margin:0;font-size:12px;overflow-wrap:anywhere;word-break:break-word;">If the button does not work, use this secure link:<br><a href="${safeLink}" style="color:#111111;text-decoration:underline;">${safeLink}</a></p>
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;margin-top:18px;border-collapse:separate;border-spacing:0;background-color:#e4e4e0;border:1px solid #c8c8c4;border-radius:8px;">
      <tr><td align="center" style="padding:12px;font-size:12px;line-height:1.5;">If you did not request a password reset, you can ignore this email.</td></tr>
    </table>
    <p style="margin:13px 0 0;font-size:11px;">ACCOUNT EMAIL<br><strong>${safeEmail}</strong></p>
    <p style="margin:14px 0 0;font-size:12px;">Need help with your account?<br>For any queries about your account, <a href="mailto:operations.overstock@gmail.com" style="color:#111111;font-weight:700;">contact us</a>.</p>`;
  const htmlContent = renderOverstockEmail(baseUrl, contentHtml);

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
