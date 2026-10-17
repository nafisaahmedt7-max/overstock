import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json({ error: "Request not allowed." }, { status: 403 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.trim().toLowerCase();
  if (!user || !email || !user.email_confirmed_at)
    return NextResponse.json({ error: "Confirm your invitation email before registering." }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey)
    return NextResponse.json({ error: "Portal registration is not configured." }, { status: 503 });

  const admin = createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data: seller, error: sellerError } = await admin
    .from("sellers")
    .select("id,email")
    .eq("status", "active")
    .eq("email", email)
    .maybeSingle();
  if (sellerError)
    return NextResponse.json({ error: "Could not verify your OVERSTOCK access." }, { status: 500 });

  const { data: fulfillmentInvite, error: inviteError } = await admin
    .from("fulfillment_invites")
    .select("partner_id,email")
    .eq("email", email)
    .maybeSingle();
  if (inviteError)
    return NextResponse.json({ error: "Could not verify your OVERSTOCK access." }, { status: 500 });

  let linked = false;
  if (seller) {
    const { error } = await admin.from("seller_users").upsert(
      { user_id: user.id, seller_id: seller.id, email },
      { onConflict: "user_id" },
    );
    if (error)
      return NextResponse.json({ error: "Could not activate seller portal access." }, { status: 500 });
    linked = true;
  }
  if (fulfillmentInvite) {
    const { error } = await admin.from("fulfillment_users").upsert(
      { user_id: user.id, partner_id: fulfillmentInvite.partner_id, email },
      { onConflict: "user_id" },
    );
    if (error)
      return NextResponse.json({ error: "Could not activate fulfilment portal access." }, { status: 500 });
    linked = true;
  }

  if (!linked)
    return NextResponse.json({ error: "This email does not have an active OVERSTOCK invitation." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
