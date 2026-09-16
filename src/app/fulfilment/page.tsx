import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FulfilmentWorkspace } from "@/components/fulfilment-workspace";
export const dynamic = "force-dynamic";
export default async function FulfilmentPortal() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/portal/login");
  const { data: member } = await sb
    .from("fulfillment_users")
    .select("partner_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) redirect("/portal");
  const { data: shipments } = await sb
    .from("outbound_shipments")
    .select("id,order_id,courier,tracking_number")
    .eq("fulfillment_partner_id", member.partner_id)
    .order("created_at", { ascending: false });
  const orderIds = (shipments ?? []).map((shipment) => shipment.order_id);
  const { data: orders } = orderIds.length
    ? await sb.from("orders").select("id,order_number,customer_name,delivery_address,journey_status,journey_timestamps").in("id", orderIds)
    : { data: [] };
  const work = (orders ?? []).map((order) => {
    const shipment = (shipments ?? []).find((row) => row.order_id === order.id)!;
    return { ...order, shipment_id: shipment.id, courier: shipment.courier, tracking_number: shipment.tracking_number };
  });
  return <FulfilmentWorkspace orders={work} />;
}
