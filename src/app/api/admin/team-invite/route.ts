import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderOverstockEmail } from "@/lib/email/overstock-layout";
import { sendToLocalMailpit } from "@/lib/email/mailpit";

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

  const useMailpit = process.env.NODE_ENV === "development" && process.env.EMAIL_PROVIDER === "mailpit";
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || (useMailpit ? "no-reply@overstock.local" : undefined);
  const senderName = process.env.BREVO_SENDER_NAME || "OVERSTOCK";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serverKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missingConfig = [
    useMailpit || apiKey ? null : "BREVO_API_KEY",
    senderEmail ? null : "BREVO_SENDER_EMAIL",
    supabaseUrl ? null : "NEXT_PUBLIC_SUPABASE_URL",
    serverKey ? null : "SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)",
  ].filter((name): name is string => name !== null);
  if (missingConfig.length) {
    return NextResponse.json({
      error: `Registration email is not configured. Missing: ${missingConfig.join(", ")}.`,
    }, { status: 503 });
  }
  const configuredApiKey = apiKey as string;
  const configuredSenderEmail = senderEmail as string;
  const configuredSupabaseUrl = supabaseUrl as string;
  const configuredServerKey = serverKey as string;

  const newPasswordPath = new URLSearchParams({ mode: "register", email }).toString();

  const adminClient = createSupabaseClient(configuredSupabaseUrl, configuredServerKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const inviteResult = await adminClient.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
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
      })
    : inviteResult;
  const tokenHash = linkResult.data?.properties?.hashed_token;
  const verificationType = linkResult.data?.properties?.verification_type;
  if (linkResult.error || !tokenHash || !verificationType) {
    const authError = linkResult.error;
    const invalidAdminKey =
      authError?.status === 401 || /invalid api key/i.test(authError?.message || "");
    const errorCode = invalidAdminKey
      ? "invalid_service_role_key"
      : authError?.code || "action_link_missing";
    console.error("OVERSTOCK invitation link generation failed", {
      flow: useExistingAccountLink ? "magiclink" : "invite",
      code: errorCode,
      status: authError?.status,
      message: authError?.message,
      redirectOrigin: new URL(request.url).origin,
    });

    return NextResponse.json({
      error: invalidAdminKey
        ? `Supabase rejected the server-side API key. Update SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) with a valid key for this Supabase project, then retry.`
        : `Supabase Auth could not create the registration link (${errorCode}). Check the server-side Auth configuration and whether this email already has a portal account, then retry.`,
    }, { status: 502 });
  }

  // Verify the one-time token on our own origin. This avoids Supabase falling
  // back to its configured Site URL when a Vercel preview URL is not allow-listed.
  const appLink = new URL("/auth/confirm", request.url);
  appLink.searchParams.set("token_hash", tokenHash);
  appLink.searchParams.set("type", verificationType);
  appLink.searchParams.set("next", `/portal/new-password?${newPasswordPath}`);

  const safeName = escapeHtml(name || "there").toUpperCase();
  const safeEmail = escapeHtml(email);
  const safeUrl = escapeHtml(appLink.toString());
  const baseUrl = new URL(request.url).origin;
  const loginUrl = escapeHtml(new URL("/portal/login", baseUrl).toString());
  const portalName = role === "seller" ? "SELLER PORTAL" : "FULFILMENT PORTAL";
  const subject = "You’re invited to the OVERSTOCK portal";
  const textContent = [
    `YOU’RE INVITED, ${safeName}`,
    "",
    `THIS INVITATION IS TO JOIN THE OVERSTOCK ${portalName}.`,
    "",
    `PORTAL ROLE: ${role === "seller" ? "SELLER" : "FULFILMENT"}`,
    `LOGIN EMAIL: ${email}`,
    "",
    `LOGIN: ${new URL("/portal/login", baseUrl).toString()}`,
    `REGISTER: ${appLink.toString()}`,
    "Click REGISTER to confirm your invitation and set your password. LOGIN opens the OVERSTOCK portal.",
    "Need help with your account? For any queries about your account, contact us at operations.overstock@gmail.com.",
    "IF YOU DID NOT REQUEST AN INVITATION, YOU CAN IGNORE THIS EMAIL.",
    `If the button does not work, use this secure link: ${appLink.toString()}`,
  ].join("\n");
  const detailsHtml = `
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#e4e4e0" style="width:100%;border-collapse:collapse;border-top:1px solid #111111;border-bottom:1px solid #111111;background-color:#e4e4e0;">
      <tr>
        <td class="os-invite-detail-cell" width="50%" align="center" valign="middle" bgcolor="#e4e4e0" style="width:50%;padding:10px 12px;background-color:#e4e4e0;text-align:center;">
          <span style="display:inline-block;vertical-align:middle;color:#111111;font-family:'Geist Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;line-height:1.5;font-weight:700;letter-spacing:.04em;white-space:nowrap;">PORTAL ROLE:</span><strong style="display:inline-block;vertical-align:middle;padding-left:5px;font-family:'Geist Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;line-height:1.5;">${role === "seller" ? "SELLER" : "FULFILMENT"}</strong>
        </td>
        <td class="os-invite-detail-cell" width="50%" align="center" valign="middle" bgcolor="#e4e4e0" style="width:50%;padding:10px 12px;border-left:1px solid #777777;background-color:#e4e4e0;text-align:center;overflow-wrap:anywhere;word-break:break-word;">
          <span style="display:inline-block;vertical-align:middle;color:#111111;font-family:'Geist Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;line-height:1.5;font-weight:700;letter-spacing:.04em;white-space:nowrap;">LOGIN EMAIL:</span><strong style="display:inline-block;vertical-align:middle;padding-left:5px;font-family:'Geist Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;line-height:1.5;"><a href="mailto:${safeEmail}" style="color:#1a73e8;font-family:'Geist Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;font-weight:700;line-height:1.5;text-decoration:underline;overflow-wrap:anywhere;word-break:break-word;">${safeEmail}</a></strong>
        </td>
      </tr>
    </table>`;
  const contentHtml = `
    <p style="margin:0 0 17px;"><span style="display:inline-block;padding:7px 18px;border:1px solid #111111;border-radius:999px;background-color:#111111;color:#f1f1ef;font-size:10px;font-weight:700;letter-spacing:.11em;">PORTAL INVITATION</span></p>
    <h1 style="margin:20px 0 9px;font-size:24px;line-height:1.2;">YOU’RE INVITED, ${safeName}</h1>
    <p style="margin:0 0 17px;color:#555;font-family:'Geist Mono',Menlo,Monaco,Consolas,monospace;font-size:10px;font-weight:500;line-height:1.5;letter-spacing:.04em;text-transform:uppercase;">THIS INVITATION IS TO JOIN THE OVERSTOCK ${portalName}.</p>
    <!--OVERSTOCK_FULL_WIDTH_SECTION-->
    <p style="margin:14px 0 8px;font-size:11px;font-weight:700;letter-spacing:.08em;">CLICK REGISTER TO SET UP YOUR ACCOUNT AND PASSWORD</p>
    <p style="margin:10px 0 0;"><a class="os-button" href="${safeUrl}" style="display:inline-block;min-width:205px;padding:12px 22px;border:1px solid #111111;border-radius:999px;background-color:#111111;color:#f1f1ef;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.11em;transition:background-color .2s ease,color .2s ease,box-shadow .2s ease;">REGISTER</a></p>
    <p style="margin:12px 0 0;"><a class="os-button" href="${loginUrl}" style="display:inline-block;min-width:205px;padding:12px 22px;border:1px solid #111111;border-radius:999px;background-color:#111111;color:#f1f1ef;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:.11em;transition:background-color .2s ease,color .2s ease,box-shadow .2s ease;">LOGIN</a></p>
    <p style="margin:13px 0 0;font-size:12px;">Need help with your account? For any queries about your account, <a href="mailto:operations.overstock@gmail.com" style="color:#111111;font-weight:700;">contact us</a>.</p>
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%;margin-top:18px;border-collapse:separate;border-spacing:0;background-color:#e4e4e0;border:1px solid #c8c8c4;border-radius:8px;">
      <tr><td align="center" style="padding:12px 14px;">
        <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr>
            <td valign="middle" style="padding:0 9px 0 0;">
              <span aria-hidden="true" style="display:block;width:18px;height:18px;border:1px solid #777777;border-radius:50%;color:#555555;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;line-height:18px;text-align:center;">i</span>
            </td>
            <td valign="middle" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.45;font-weight:700;text-align:left;">
              <strong style="font-weight:700;">IF YOU DID NOT REQUEST AN INVITATION, YOU CAN IGNORE THIS EMAIL.</strong>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
    <p style="margin:14px 0 0;font-size:12px;">If the button does not work, use this secure <a href="${safeUrl}" style="color:#1a73e8;text-decoration:underline;">link</a>.</p>`;
  const htmlContent = renderOverstockEmail(baseUrl, contentHtml, detailsHtml);

  if (useMailpit) {
    try {
      const localResponse = await sendToLocalMailpit({
        fromEmail: configuredSenderEmail,
        fromName: senderName,
        toEmail: email,
        toName: name || email,
        subject,
        text: textContent,
        html: htmlContent,
      });
      if (!localResponse.ok) {
        console.error("OVERSTOCK registration email rejected by local Mailpit", {
          role,
          status: localResponse.status,
        });
        return NextResponse.json({ error: "Mailpit could not capture the registration email. Check that it is running on the configured local URL." }, { status: 502 });
      }
      console.info("OVERSTOCK registration email captured by local Mailpit", { role });
      return NextResponse.json({ ok: true, acceptedByProvider: true, provider: "mailpit" });
    } catch (error) {
      console.error("OVERSTOCK local Mailpit request failed", {
        role,
        error: error instanceof Error ? error.message : "unknown",
      });
      return NextResponse.json({ error: "Could not connect to local Mailpit. Start Mailpit and try again." }, { status: 502 });
    }
  }

  const brevoApiKey = apiKey as string;
  let response: Response;
  try {
    response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": brevoApiKey,
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

  const brevoResult = await response.json().catch(() => null) as {
    message?: string;
    messageId?: string;
    code?: string;
  } | null;
  if (!response.ok) {
    console.error("OVERSTOCK registration email rejected by Brevo", {
      role,
      status: response.status,
      message: brevoResult?.message || brevoResult?.code || "provider_error",
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
