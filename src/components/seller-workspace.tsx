"use client";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { journeyLabel, JourneyStatus, OrderTimeline, TrackingGuide } from "./order-timeline";

export type SellerOrder = {
  id: string; order_number: number; journey_status: JourneyStatus;
  journey_timestamps: Record<string, string>; product_name: string;
  selected_size: string | null; quantity: number; seller_due: number; payout_status: string;
  package_id: string | null; seller_id: string; inbound_courier: string | null; inbound_tracking: string | null;
};

export function SellerWorkspace({ orders, due }: { orders: SellerOrder[]; due: string }) {
  const [notice, setNotice] = useState("");
  const sb = createClient();
  async function advance(event: FormEvent<HTMLFormElement>, order: SellerOrder, target: JourneyStatus) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (order.package_id && target === "sent_to_fulfillment") {
      const { error } = await sb.from("seller_package_updates").upsert({
        package_id: order.package_id, seller_id: order.seller_id,
        courier: String(form.get("courier") || ""), tracking_number: String(form.get("tracking") || ""),
        confirmed_at: new Date().toISOString(), dispatched_at: new Date().toISOString(),
      });
      if (error) { setNotice(error.message); return; }
    }
    const { error } = await sb.rpc("advance_order_journey", { target_order_id: order.id, target_status: target, note: null });
    setNotice(error?.message || "Order progress updated for OVERSTOCK and fulfillment.");
    if (!error) window.setTimeout(() => location.reload(), 500);
  }
  const actionCount = orders.filter(o => ["admin_confirmed", "seller_preparing"].includes(o.journey_status)).length;
  return <main className="partner-page">
    <header><div><p className="eyebrow">OVERSTOCK / SELLER PORTAL</p><h1>MY ORDERS</h1></div><div><span>AMOUNT DUE</span><b>{due}</b></div></header>
    {notice && <div className="portal-alert" role="status">{notice}</div>}
    <div className="portal-summary"><article><span>ACTION REQUIRED</span><b>{actionCount}</b></article><article><span>TOTAL ORDERS</span><b>{orders.length}</b></article><article><span>SELLER BALANCE</span><b>{due}</b></article></div>
    <TrackingGuide role="seller" />
    <div className="order-card-list">
      {orders.length ? orders.map(order => <article className="order-card" key={order.id}>
        <header><div><p className="eyebrow">ORDER #{order.order_number}</p><h2>{order.product_name}</h2><small>{order.selected_size || "NO SIZE"} / QTY {order.quantity}</small></div><span className="status-badge" data-status={order.journey_status}>{journeyLabel(order.journey_status)}</span></header>
        <OrderTimeline status={order.journey_status} timestamps={order.journey_timestamps} />
        {order.journey_status === "admin_confirmed" && <form onSubmit={e => void advance(e, order, "seller_preparing")}><p>The order is confirmed. Press when you begin sourcing and preparing it.</p><button className="seller-action">SELLER PREPARING ORDER</button></form>}
        {order.journey_status === "seller_preparing" && <form className="order-action-form" onSubmit={e => void advance(e, order, "sent_to_fulfillment")}><label>COURIER TO FULFILMENT<input name="courier" placeholder="EXAMPLE: PATHAO" defaultValue={order.inbound_courier || ""} required /></label><label>PACKAGE TRACKING<input name="tracking" placeholder="EXAMPLE: PKG-10245" defaultValue={order.inbound_tracking || ""} required /></label><button className="seller-action">PACKAGE SENT TO FULFILMENT</button></form>}
        <footer><span>YOUR EARNINGS</span><b>A\${Number(order.seller_due || 0).toFixed(2)}</b><span>{order.payout_status.replaceAll("_", " ")}</span></footer>
      </article>) : <div className="empty-state">NO SELLER ORDERS YET</div>}
    </div>
  </main>;
}
