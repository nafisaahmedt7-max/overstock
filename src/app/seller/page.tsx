import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SellerWorkspace, type SellerOrder } from "@/components/seller-workspace";
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
  const { data, error } = await sb.rpc("get_my_seller_orders");
  const orders: SellerOrder[] = error ? [] : ((data ?? []) as SellerOrder[]);
  const due = orders
      .filter((x) => x.payout_status === "due")
      .reduce((n, x) => n + Number(x.seller_due || 0), 0),
    formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(due);
  return (
    <SellerWorkspace
      orders={orders as SellerOrder[]}
      due={formatted}
    />
  );
}
