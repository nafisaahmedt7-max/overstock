import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SellerWorkspace } from "@/components/seller-workspace";
export const dynamic = "force-dynamic";
export default async function SellerPortal() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/portal/login");
  const { data: member } = await sb
    .from("seller_users")
    .select("seller_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) redirect("/portal");
  const [feed, packs] = await Promise.all([
    sb
      .from("seller_order_feed")
      .select("*")
      .order("ordered_at", { ascending: false }),
    sb
      .from("inbound_packages")
      .select("id,package_number,status,inbound_courier,inbound_tracking")
      .order("created_at", { ascending: false }),
  ]);
  const rows = feed.data ?? [],
    due = rows
      .filter((x) => x.payout_status === "due")
      .reduce((n, x) => n + Number(x.seller_due || 0), 0),
    formatted = new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(due);
  return (
    <SellerWorkspace
      sellerId={member.seller_id}
      rows={rows}
      packages={packs.data ?? []}
      due={formatted}
    />
  );
}
