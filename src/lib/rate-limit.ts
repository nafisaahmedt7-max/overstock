import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RateLimitResult = "allowed" | "limited" | "unavailable";

export async function checkRateLimit(
  supabase: SupabaseClient,
  request: Request,
  scope: "checkout" | "verify",
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const trustedIp =
    request.headers.get("x-real-ip")?.trim() ||
    (request.headers.get("x-forwarded-for")?.split(",").slice(-1)[0] || "").trim() ||
    "unknown";
  const key = scope + ":" + createHash("sha256").update(trustedIp).digest("hex");
  const { data, error } = await supabase.rpc("consume_api_rate_limit", {
    p_key: key,
    p_limit: maxRequests,
    p_window_seconds: windowSeconds,
  });
  if (error || typeof data !== "boolean") return "unavailable";
  return data ? "allowed" : "limited";
}
