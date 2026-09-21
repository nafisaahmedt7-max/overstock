"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { journeyLabel, JourneyStatus, OrderTimeline } from "./order-timeline";
import { StatusConnectionGuide } from "./status-connection-guide";

export type SellerOrder = {
  id: string; order_number: number; journey_status: JourneyStatus;
  journey_timestamps: Record<string, string>; product_name: string;
  selected_size: string | null; quantity: number; seller_due: number; payout_status: string;
  package_id: string | null; seller_id: string; inbound_courier: string | null; inbound_tracking: string | null;
  refund_status: string; refund_amount: number;
};

export function SellerWorkspace({ orders, due }: { orders: SellerOrder[]; due: string }) {
  const [notice, setNotice] = useState("");
  const sb = createClient();
  const router = useRouter();
  async function signOut() {
    const { error } = await sb.auth.signOut();
    if (error) { setNotice(error.message); return; }
    router.replace("/portal/login");
    router.refresh();
  }
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
  async function requestCancellation(orderId: string) {
    const reason = window.prompt("Tell admin why this order should be cancelled:");
    if (reason === null) return;
    const { error } = await sb.rpc("request_order_cancellation", {
      target_order_id: orderId,
      reason: reason.trim() || null,
    });
    setNotice(error?.message || "Cancellation request sent to admin for confirmation.");
  }
  async function markRefundSent(orderId: string) {
    const { error } = await sb.rpc("seller_mark_refund_sent", { target_order_id: orderId });
    setNotice(error?.message || "Refund marked sent. OVERSTOCK can now confirm receipt.");
    if (!error) window.setTimeout(() => location.reload(), 500);
  }
  const actionCount = orders.filter(o => ["admin_confirmed", "seller_preparing"].includes(o.journey_status)).length;
  return <main className="partner-page">
    <header><div><p className="eyebrow">OVERSTOCK / SELLER PORTAL</p><h1>MY ORDERS</h1></div><div className="partner-header-actions"><div><span>AMOUNT DUE</span><b>{due}</b></div><button onClick={() => void signOut()}>SIGN OUT</button></div></header>
    {notice && <div className="portal-alert" role="status">{notice}</div>}
    <div className="portal-summary"><article><span>ACTION REQUIRED</span><b>{actionCount}</b></article><article><span>TOTAL ORDERS</span><b>{orders.length}</b></article><article><span>SELLER BALANCE</span><b>{due}</b></article></div>
    <StatusConnectionGuide role="seller" title="SELLER STATUS DICTIONARY" />
    <div className="order-card-list">
      {orders.length ? orders.map(order => <details className="order-card order-receipt-details" key={order.id}>
        <summary><span><small>ORDER</small><b>#{order.order_number}</b></span><span className="order-summary-status"><small>CURRENT STATUS</small><b className="status-badge" data-status={order.journey_status}>{journeyLabel(order.journey_status)}</b></span></summary>
        <div className="order-receipt-body">
        <header><div><p className="eyebrow">ORDER #{order.order_number}</p><h2>{order.product_name}</h2><small>{order.selected_size || "NO SIZE"} / QTY {order.quantity}</small></div></header>
        <OrderTimeline status={order.journey_status} timestamps={order.journey_timestamps} />
        {order.journey_status === "admin_confirmed" && <form onSubmit={e => void advance(e, order, "seller_preparing")}><p>The order is confirmed. Press when you begin sourcing and preparing it.</p><button className="seller-action">SELLER PREPARING ORDER</button></form>}
        {order.journey_status === "seller_preparing" && <form className="order-action-form" onSubmit={e => void advance(e, order, "sent_to_fulfillment")}><label>COURIER TO FULFILMENT<input name="courier" placeholder="EXAMPLE: PATHAO" defaultValue={order.inbound_courier || ""} required /></label><label>PACKAGE TRACKING NUMBER<input name="tracking" inputMode="numeric" pattern="[0-9]{6,30}" title="Use 6 to 30 tracking digits only." placeholder="NUMBERS ONLY" defaultValue={order.inbound_tracking || ""} required /></label><button className="seller-action">PACKAGE SENT TO FULFILMENT</button></form>}
        <footer><span>YOUR SHARE</span><b>US\${Number(order.seller_due || 0).toFixed(2)}</b><span>{order.payout_status === "held" ? "REFUND REQUESTED" : order.payout_status === "paid" ? "PAID" : "PAYMENT DUE"}</span>{order.journey_status === "cancelled" && order.refund_status === "due_from_seller" && <button className="seller-action" onClick={() => void markRefundSent(order.id)}>MARK REFUND SENT</button>}{!["delivered","cancelled"].includes(order.journey_status) && <button className="cancellation-request-button" onClick={() => void requestCancellation(order.id)}>REQUEST CANCELLATION</button>}</footer>
        </div>
      </details>) : <div className="empty-state">NO SELLER ORDERS YET</div>}
    </div>
  </main>;
}
