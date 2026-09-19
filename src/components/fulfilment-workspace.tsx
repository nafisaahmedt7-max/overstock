"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { journeyLabel, JourneyStatus, OrderTimeline } from "./order-timeline";
import { StatusConnectionGuide } from "./status-connection-guide";

type WorkOrder = {
  id: string; order_number: number; customer_name: string; delivery_address: string | null;
  journey_status: JourneyStatus; journey_timestamps: Record<string, string>;
  shipment_id: string; courier: string | null; tracking_number: string | null;
};
const next: Partial<Record<JourneyStatus, { status: JourneyStatus; label: string }>> = {
  awaiting_package: { status: "received_by_fulfillment", label: "PACKAGE RECEIVED" },
  received_by_fulfillment: { status: "qc_ongoing", label: "START QC" },
  qc_ongoing: { status: "package_prepared", label: "PACKAGE PREPARED" },
  package_prepared: { status: "sent_to_customer", label: "PACKAGE SENT TO COURIER" },
  sent_to_customer: { status: "package_in_transit", label: "PACKAGE IN TRANSIT (GPO)" },
  package_in_transit: { status: "delivered", label: "PACKAGE DELIVERED" },
};

export function FulfilmentWorkspace({ orders }: { orders: WorkOrder[] }) {
  const sb = createClient();
  const [notice, setNotice] = useState("");
  const router = useRouter();
  async function signOut() {
    const { error } = await sb.auth.signOut();
    if (error) { setNotice(error.message); return; }
    router.replace("/portal/login");
    router.refresh();
  }
  async function advance(event: FormEvent<HTMLFormElement>, order: WorkOrder, target: JourneyStatus) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (target === "sent_to_customer") {
      const { error } = await sb.from("outbound_shipments").update({
        courier: String(data.get("courier") || ""), tracking_number: String(data.get("tracking") || ""),
      }).eq("id", order.shipment_id);
      if (error) { setNotice(error.message); return; }
    }
    const { error } = await sb.rpc("advance_order_journey", { target_order_id: order.id, target_status: target, note: null });
    setNotice(error?.message || "Shared order journey updated.");
    if (!error) window.setTimeout(() => location.reload(), 500);
  }
  async function requestCancellation(orderId: string) {
    const reason = window.prompt("Tell admin why this order should be cancelled:");
    if (reason === null) return;
    const { error } = await sb.rpc("request_order_cancellation", {
      target_order_id: orderId,
      reason: reason.trim() || null,
    });
    setNotice(error?.message || "Cancellation request sent to admin for confirmation.");
  }
  return <main className="partner-page">
    <header><div><p className="eyebrow">OVERSTOCK / FULFILLMENT</p><h1>ORDER DESK</h1></div><div className="partner-header-actions"><div><span>ACTION REQUIRED</span><b>{orders.filter(o => next[o.journey_status]).length}</b></div><button onClick={() => void signOut()}>SIGN OUT</button></div></header>
    {notice && <div className="portal-alert" role="alert">{notice}</div>}
    <div className="portal-summary"><article><span>AWAITING PACKAGE</span><b>{orders.filter(o => o.journey_status === "awaiting_package").length}</b></article><article><span>IN WAREHOUSE</span><b>{orders.filter(o => ["received_by_fulfillment","qc_ongoing","package_prepared"].includes(o.journey_status)).length}</b></article><article><span>WITH COURIER</span><b>{orders.filter(o => ["sent_to_customer","package_in_transit"].includes(o.journey_status)).length}</b></article></div>
    <StatusConnectionGuide role="fulfilment" title="FULFILMENT STATUS DICTIONARY" />
    <div className="order-card-list">
      {orders.map(order => {
        const action = next[order.journey_status];
        return <details className="order-card order-receipt-details" key={order.id}>
          <summary><span><small>ORDER</small><b>#{order.order_number}</b></span><span className="order-summary-status"><small>CURRENT STATUS</small><b className="status-badge" data-status={order.journey_status}>{journeyLabel(order.journey_status)}</b></span></summary>
          <div className="order-receipt-body">
          <header><div><p className="eyebrow">ORDER #{order.order_number}</p><h2>{order.customer_name}</h2><small>{order.delivery_address || "ADDRESS PENDING"}</small></div></header>
          <OrderTimeline status={order.journey_status} timestamps={order.journey_timestamps} />
          {action && <form className="order-action-form" onSubmit={e => void advance(e, order, action.status)}>
            {action.status === "sent_to_customer" && <><label>OUTBOUND COURIER (OPTIONAL FOR NOW)<input name="courier" placeholder="EXAMPLE: DHL" defaultValue={order.courier || ""} /></label><label>CUSTOMER TRACKING (OPTIONAL FOR NOW)<input name="tracking" placeholder="EXAMPLE: DHL-10245" defaultValue={order.tracking_number || ""} /></label></>}
            <button className="fulfilment-action">{action.label}</button>
          </form>}
          {!["delivered","cancelled"].includes(order.journey_status) && <footer><span>NEED ADMIN HELP?</span><b>Cancellation requires admin confirmation.</b><button className="cancellation-request-button" onClick={() => void requestCancellation(order.id)}>REQUEST CANCELLATION</button></footer>}
          </div>
        </details>;
      })}
    </div>
  </main>;
}
