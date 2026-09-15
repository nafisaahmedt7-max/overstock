"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatusConnectionGuide } from "./status-connection-guide";
type Package = {
  id: string;
  package_number: number;
  status: string;
  inbound_courier: string | null;
  inbound_tracking: string | null;
  expected_arrival: string | null;
  received_at: string | null;
  qc_result: string;
  expected_item_count: number;
  seller_id: string;
};
type Shipment = {
  id: string;
  shipment_number: number;
  status: string;
  recipient_name: string;
  recipient_phone: string | null;
  delivery_address: string;
  courier: string | null;
  tracking_number: string | null;
  weight_grams: number | null;
};
export function FulfilmentWorkspace({
  packages,
  shipments,
}: {
  packages: Package[];
  shipments: Shipment[];
}) {
  const sb = createClient();
  const [notice, setNotice] = useState("");
  async function updatePackage(id: string, status: string) {
    const values: Record<string, string> = { status };
    if (status === "received") values.received_at = new Date().toISOString();
    const { error } = await sb
      .from("inbound_packages")
      .update(values)
      .eq("id", id);
    if (error) {
      setNotice(error.message);
      return;
    }
    location.reload();
  }
  async function updateShipment(
    event: React.FormEvent<HTMLFormElement>,
    id: string,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = String(form.get("status"));
    const values: Record<string, string> = {
      status,
      courier: String(form.get("courier") || ""),
      tracking_number: String(form.get("tracking") || ""),
    };
    if (status === "outbound_shipped")
      values.shipped_at = new Date().toISOString();
    if (status === "delivered") values.delivered_at = new Date().toISOString();
    const { error } = await sb
      .from("outbound_shipments")
      .update(values)
      .eq("id", id);
    if (error) {
      setNotice(error.message);
      return;
    }
    location.reload();
  }
  return (
    <main className="partner-page">
      <header>
        <div>
          <p className="eyebrow">OVERSTOCK / FULFILMENT</p>
          <h1>PACKAGE DESK</h1>
        </div>
        <div>
          <span>INBOUND</span>
          <b>{packages.length}</b>
        </div>
      </header>
      {notice && (
        <div className="portal-alert" role="alert">
          {notice}
        </div>
      )}
      <section className="role-guide">
        <b>YOUR CONTROL</b>
        <p>
          Verify package receipt and quality, then control Ready to pack,
          Packed, Shipped and Delivered. Sellers control their confirmation and
          inbound tracking. OVERSTOCK can audit and correct every stage.
        </p>
      </section>
      <StatusConnectionGuide role="fulfilment" />
      <h2>INCOMING SELLER PACKAGES</h2>
      <div className="package-grid">
        {packages.map((p) => (
          <article key={p.id}>
            <b>PKG-{p.package_number}</b>
            <span>{p.expected_item_count} ITEM(S)</span>
            <small>
              {p.inbound_courier || "COURIER PENDING"} /{" "}
              {p.inbound_tracking || "NO TRACKING"}
            </small>
            <select
              data-status={p.status}
              value={p.status}
              onChange={(e) => void updatePackage(p.id, e.target.value)}
            >
              {!["received", "qc_hold", "qc_passed", "ready_to_pack"].includes(
                p.status,
              ) && (
                <option value={p.status} disabled>
                  {p.status} — WAITING FOR SELLER
                </option>
              )}
              {["received", "qc_hold", "qc_passed", "ready_to_pack"].map(
                (x) => (
                  <option key={x} value={x}>
                    {x.replaceAll("_", " ").toUpperCase()}
                  </option>
                ),
              )}
            </select>
          </article>
        ))}
      </div>
      <h2>OUTBOUND CUSTOMER SHIPMENTS</h2>
      <div className="package-grid">
        {shipments.map((s) => (
          <form
            key={s.id}
            className="shipment-card"
            onSubmit={(event) => void updateShipment(event, s.id)}
          >
            <b>SHIP-{s.shipment_number}</b>
            <span>{s.recipient_name}</span>
            <small>{s.delivery_address}</small>
            <input
              name="courier"
              defaultValue={s.courier || ""}
              placeholder="OUTBOUND COURIER"
            />
            <input
              name="tracking"
              defaultValue={s.tracking_number || ""}
              placeholder="CUSTOMER TRACKING NUMBER"
            />
            <select
              name="status"
              data-status={s.status}
              value={s.status}
              onChange={(event) => {
                event.currentTarget.form?.requestSubmit();
              }}
            >
              {[
                "ready_to_pack",
                "packed",
                "outbound_shipped",
                "delivered",
                "cancelled",
              ].map((x) => (
                <option key={x} value={x}>
                  {x.replaceAll("_", " ").toUpperCase()}
                </option>
              ))}
            </select>
            <button>UPDATE SHIPMENT</button>
          </form>
        ))}
      </div>
    </main>
  );
}
