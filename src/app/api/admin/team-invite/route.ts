import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function POST(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin && origin !== requestOrigin)
    return NextResponse.json({ error: "Request not allowed." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const role = body.role;
  const memberId = String(body.memberId || "");
  const email = String(body.email || "").trim().toLowerCase();
  if (
    (role !== "seller" && role !== "fulfilment") ||
    !/^[0-9a-f-]{36}$/i.test(memberId) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return NextResponse.json({ error: "Invalid invitation details." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in as an OVERSTOCK admin first." }, { status: 401 });

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin)
    return NextResponse.json({ error: "Only OVERSTOCK admins can send invitations." }, { status: 403 });

  let name = String(body.name || "").trim();
  if (role === "seller") {
    const { data: seller } = await supabase
      .from("sellers")
      .select("id,email,display_name")
      .eq("id", memberId)
      .maybeSingle();
    if (!seller || String(seller.email || "").trim().toLowerCase() !== email)
      return NextResponse.json({ error: "The seller invitation could not be verified." }, { status: 404 });
    name = seller.display_name;
  } else {
    const { data: invitation } = await supabase
      .from("fulfillment_invites")
      .select("email,partner_id")
      .eq("partner_id", memberId)
      .eq("email", email)
      .maybeSingle();
    const { data: partner } = await supabase
      .from("fulfillment_partners")
      .select("name")
      .eq("id", memberId)
      .maybeSingle();
    if (!invitation || !partner || !partner.name)
      return NextResponse.json({ error: "The fulfilment invitation could not be verified." }, { status: 404 });
    name = partner.name;
  }

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "OVERSTOCK";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serverKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missingConfig = [
    apiKey ? null : "BREVO_API_KEY",
    senderEmail ? null : "BREVO_SENDER_EMAIL",
    supabaseUrl ? null : "NEXT_PUBLIC_SUPABASE_URL",
    serverKey ? null : "SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)",
  ].filter((name): name is string => name !== null);
  if (missingConfig.length)
    return NextResponse.json({ error: `Registration email is not configured. Missing: ${missingConfig.join(", ")}.` }, { status: 503 });
  const configuredApiKey = apiKey as string;
  const configuredSenderEmail = senderEmail as string;
  const configuredSupabaseUrl = supabaseUrl as string;
  const configuredServerKey = serverKey as string;

  const registrationUrl = new URL("/portal/login", request.url);
  registrationUrl.searchParams.set("mode", "register");
  registrationUrl.searchParams.set("email", email);

  const adminClient = createSupabaseClient(configuredSupabaseUrl, configuredServerKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const inviteResult = await adminClient.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo: registrationUrl.toString(),
      data: { portal_role: role, display_name: name },
    },
  });

  // An existing Auth account cannot receive another "invite" link. Send a
  // secure sign-in link instead; registration completion will attach the
  // account to the newly added seller or fulfilment record.
  const useExistingAccountLink = ["email_exists", "user_already_exists"].includes(
    inviteResult.error?.code || "",
  );
  const linkResult = useExistingAccountLink
    ? await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: registrationUrl.toString() },
      })
    : inviteResult;
  const actionLink = linkResult.data?.properties?.action_link;
  if (linkResult.error || !actionLink) {
    const authError = linkResult.error;
    const invalidAdminKey =
      authError?.status === 401 || /invalid api key/i.test(authError?.message || "");
    const errorCode = invalidAdminKey
      ? "invalid_service_role_key"
      : authError?.code || "action_link_missing";
    const redirectRejected =
      errorCode === "redirect_to_not_allowed" ||
      /redirect.*(not allowed|allowlist|allowed)/i.test(authError?.message || "");
    console.error("OVERSTOCK invitation link generation failed", {
      flow: useExistingAccountLink ? "magiclink" : "invite",
      code: errorCode,
      status: authError?.status,
      message: authError?.message,
      redirectOrigin: registrationUrl.origin,
    });

    return NextResponse.json({
      error: invalidAdminKey
        ? `Supabase rejected the server-side API key. Update SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) with a valid key for this Supabase project, then retry.`
        : redirectRejected
          ? `Supabase Auth rejected this site's redirect address (${registrationUrl.origin}). Add this site to Supabase Auth → URL Configuration → Redirect URLs, then retry.`
          : `Supabase Auth could not create the registration link (${errorCode}). Check the Auth redirect URL settings and whether this email already has a portal account, then retry.`,
    }, { status: 502 });
  }

  const safeName = escapeHtml(name || "there");
  const safeEmail = escapeHtml(email);
  const safeUrl = escapeHtml(actionLink);
  const roleLabel = role === "seller" ? "seller" : "fulfilment team member";
  const subject = useExistingAccountLink ? "Confirm your OVERSTOCK portal access" : "Confirm your OVERSTOCK portal invitation";
  const textContent = [
    `Hello ${name || "there"},`,
    "",
    `OVERSTOCK has approved your access as a ${roleLabel}.`,
    `Your portal access is linked to this email address: ${email}`,
    `Confirm your invitation and set your password: ${actionLink}`,
    "",
    "The secure link confirms your invitation and opens the password setup form. Choose a password and enter it again to confirm. You can then sign in to the portal.",
    "Your portal access is linked to the invited email address. If you were not expecting this invitation, you can ignore this message.",
  ].join("\n");
  const htmlContent = `<!doctype html><html><body style="margin:0;background:#f1f1ee;color:#111;font-family:Arial,sans-serif"><main style="max-width:600px;margin:32px auto;padding:32px;background:#fff;border:1px solid #111"><p style="font-size:12px;font-weight:bold;letter-spacing:2px">OVERSTOCK / PORTAL ACCESS</p><h1 style="font-size:24px">Confirm your portal invitation</h1><p>Hello ${safeName},</p><p>OVERSTOCK has approved your access as a ${roleLabel}. Your portal access is linked to this email address:</p><p style="padding:12px;background:#eee;font-weight:bold">${safeEmail}</p><p>The button below confirms your invitation and opens the password setup form. Choose a password and enter it again to confirm.</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;padding:14px 20px;background:#111;color:#fff;text-decoration:none;font-weight:bold">CONFIRM AND SET PASSWORD</a></p><p>Your portal access is linked to the invited email address. If you were not expecting this invitation, you can ignore this message.</p></main></body></html>`;

  let response: Response;
  try {
    response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": configuredApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: configuredSenderEmail },
        to: [{ email, name: name || email }],
        subject,
        textContent,
        htmlContent,
      }),
    });
  } catch (error) {
    console.error("OVERSTOCK registration email request failed before a response", {
      role,
      error: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: "The registration email could not be sent. Please try again." }, { status: 502 });
  }

  const brevoResult = await response.json().catch(() => null) as { messageId?: string; code?: string } | null;
  if (!response.ok) {
    console.error("OVERSTOCK registration email rejected by Brevo", {
      role,
      status: response.status,
      code: brevoResult?.code || "provider_error",
    });
    return NextResponse.json({
      error: `Brevo rejected the registration email (HTTP ${response.status}). Check the sender configuration in Brevo, then retry.`,
    }, { status: 502 });
  }

  console.info("OVERSTOCK registration email accepted by Brevo", {
    role,
    messageId: brevoResult?.messageId || "not_returned",
  });
  return NextResponse.json({ ok: true, acceptedByProvider: true });
}
