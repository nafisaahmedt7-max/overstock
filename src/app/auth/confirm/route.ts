import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TOKEN_TYPES = new Set(["invite", "magiclink", "recovery"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash") || "";
  const tokenType = url.searchParams.get("type") || "";
  const requestedNext = url.searchParams.get("next") || "/portal/new-password";
  let safeNext = "/portal/new-password";
  try {
    const candidate = new URL(requestedNext, url.origin);
    if (candidate.origin === url.origin && candidate.pathname === "/portal/new-password") {
      safeNext = `${candidate.pathname}${candidate.search}`;
    }
  } catch {
    // Invalid next paths use the password page default.
  }

  if (!tokenHash || !TOKEN_TYPES.has(tokenType)) {
    return NextResponse.redirect(new URL("/portal/new-password?error=link", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: tokenType as "invite" | "magiclink" | "recovery",
  });

  if (error) {
    return NextResponse.redirect(new URL("/portal/new-password?error=link", url.origin));
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
