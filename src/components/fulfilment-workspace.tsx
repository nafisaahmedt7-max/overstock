"use client";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { journeyLabel, JourneyStatus, OrderTimeline, TrackingGuide } from "./order-timeline";

type WorkOrder = {
  id: string; order_number: number; customer_name: string; delivery_address: string | null;
  journey_status: JourneyStatus; journey_timestamps: Record<string, string>;
  shipment_id: string; courier: string | null; tracking_number: string | null;
};
const next: Partial<Record<JourneyStatus, { status: JourneyStatus; label: string }>> = {
  sent_to_fulfillment: { status: "received_by_fulfillment", label: "PACKAGE RECEIVED" },
  received_by_fulfillment: { status: "preparing_for_customer", label: "QC PASSED" },
  preparing_for_customer: { status: "sent_to_customer", label: "SHIPPED TO COURIER" },
  sent_to_customer: { status: "delivered", label: "DELIVERED" },
};

export function FulfilmentWorkspace({ orders }: { orders: WorkOrder[] }) {
  const sb = createClient();
  const [notice, setNotice] = useState("");
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
  return <main className="partner-page">
    <header><div><p className="eyebrow">OVERSTOCK / FULFILLMENT</p><h1>ORDER DESK</h1></div><div><span>ACTION REQUIRED</span><b>{orders.filter(o => next[o.journey_status]).length}</b></div></header>
    {notice && <div className="portal-alert" role="alert">{notice}</div>}
    <div className="portal-summary"><article><span>INBOUND</span><b>{orders.filter(o => o.journey_status === "sent_to_fulfillment").length}</b></article><article><span>PREPARING</span><b>{orders.filter(o => ["received_by_fulfillment","preparing_for_customer"].includes(o.journey_status)).length}</b></article><article><span>OUT FOR DELIVERY</span><b>{orders.filter(o => o.journey_status === "sent_to_customer").length}</b></article></div>
    <TrackingGuide role="fulfillment" />
    <div className="order-card-list">
      {orders.map(order => {
        const action = next[order.journey_status];
        return <article className="order-card" key={order.id}>
          <header><div><p className="eyebrow">ORDER #{order.order_number}</p><h2>{order.customer_name}</h2><small>{order.delivery_address || "ADDRESS PENDING"}</small></div><span className="status-badge" data-status={order.journey_status}>{journeyLabel(order.journey_status)}</span></header>
          <OrderTimeline status={order.journey_status} timestamps={order.journey_timestamps} />
          {action && <form className="order-action-form" onSubmit={e => void advance(e, order, action.status)}>
            {action.status === "sent_to_customer" && <><label>OUTBOUND COURIER (OPTIONAL FOR NOW)<input name="courier" placeholder="EXAMPLE: DHL" defaultValue={order.courier || ""} /></label><label>CUSTOMER TRACKING (OPTIONAL FOR NOW)<input name="tracking" placeholder="EXAMPLE: DHL-10245" defaultValue={order.tracking_number || ""} /></label></>}
            <button className="admin-primary">{action.label}</button>
          </form>}
        </article>;
      })}
    </div>
  </main>;
}
