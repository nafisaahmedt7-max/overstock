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
  const [items, packs] = await Promise.all([
    sb
      .from("order_items")
      .select("id,order_id,product_name,selected_size,quantity,seller_due,payout_status,seller_id")
      .eq("seller_id", member.seller_id)
      .order("created_at", { ascending: false }),
    sb
      .from("inbound_packages")
      .select("id,order_id,status,inbound_courier,inbound_tracking,seller_id")
      .eq("seller_id", member.seller_id)
      .order("created_at", { ascending: false }),
  ]);
  const orderIds = [...new Set((items.data ?? []).map((item) => item.order_id))];
  const { data: orderRows } = orderIds.length
    ? await sb.from("orders").select("id,order_number,journey_status,journey_timestamps,placed_at").in("id", orderIds)
    : { data: [] };
  const orders = (items.data ?? []).map((item) => {
    const order = (orderRows ?? []).find((row) => row.id === item.order_id);
    const pack = (packs.data ?? []).find((row) => row.order_id === item.order_id);
    return { ...item, ...order, package_id: pack?.id ?? null, inbound_courier: pack?.inbound_courier ?? null, inbound_tracking: pack?.inbound_tracking ?? null };
  }).filter((row) => row.order_number);
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
