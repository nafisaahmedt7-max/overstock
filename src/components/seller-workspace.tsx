"use client";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
type Feed = {
  order_item_id: string;
  order_number: number;
  product_name: string;
  sku: string;
  selected_size: string | null;
  quantity: number;
  package_number: number | null;
  seller_due: number | null;
  payout_status: string;
};
type Package = {
  id: string;
  package_number: number;
  status: string;
  inbound_courier: string | null;
  inbound_tracking: string | null;
};
export function SellerWorkspace({
  sellerId,
  rows,
  packages,
  due,
}: {
  sellerId: string;
  rows: Feed[];
  packages: Package[];
  due: string;
}) {
  const [notice, setNotice] = useState("");
  const sb = createClient();
  async function update(e: FormEvent<HTMLFormElement>, p: Package) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      action = String(f.get("action"));
    const { error } = await sb
      .from("seller_package_updates")
      .upsert({
        package_id: p.id,
        seller_id: sellerId,
        confirmed_at: new Date().toISOString(),
        courier: String(f.get("courier") || ""),
        tracking_number: String(f.get("tracking") || ""),
        dispatched_at: action === "dispatch" ? new Date().toISOString() : null,
      });
    setNotice(
      error?.message ||
        (action === "dispatch"
          ? "Dispatch recorded. OVERSTOCK and the warehouse can now track it."
          : "Order confirmed."),
    );
    if (!error) window.setTimeout(() => location.reload(), 700);
  }
  return (
    <main className="partner-page">
      <header>
        <div>
          <p className="eyebrow">OVERSTOCK / SELLER PORTAL</p>
          <h1>MY ORDERS</h1>
        </div>
        <div>
          <span>AMOUNT DUE</span>
          <b>{due}</b>
        </div>
      </header>
      {notice && (
        <div className="portal-alert" role="status">
          {notice}
        </div>
      )}
      <section className="role-guide">
        <b>YOUR CONTROL</b>
        <p>
          Confirm supply, then add courier and tracking when dispatched.
          OVERSTOCK approves products and payouts. The fulfilment company
          verifies receipt, quality and delivery.
        </p>
      </section>
      <div className="seller-package-list">
        {packages.map((p) => (
          <form key={p.id} onSubmit={(e) => void update(e, p)}>
            <header>
              <b>PKG-{p.package_number}</b>
              <span>{p.status.replaceAll("_", " ")}</span>
            </header>
            <input
              name="courier"
              defaultValue={p.inbound_courier || ""}
              placeholder="COURIER"
            />
            <input
              name="tracking"
              defaultValue={p.inbound_tracking || ""}
              placeholder="TRACKING NUMBER"
            />
            <div>
              <button name="action" value="confirm">
                CONFIRM SUPPLY
              </button>
              <button className="admin-primary" name="action" value="dispatch">
                MARK DISPATCHED
              </button>
            </div>
          </form>
        ))}
      </div>
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>ORDER</th>
              <th>PRODUCT</th>
              <th>SIZE</th>
              <th>QTY</th>
              <th>PACKAGE</th>
              <th>SELLER DUE</th>
              <th>PAYOUT</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((r) => (
                <tr key={r.order_item_id}>
                  <td>#{r.order_number}</td>
                  <td>
                    {r.product_name}
                    <small>{r.sku}</small>
                  </td>
                  <td>{r.selected_size || "—"}</td>
                  <td>{r.quantity}</td>
                  <td>{r.package_number ? `PKG-${r.package_number}` : "—"}</td>
                  <td>A${Number(r.seller_due || 0).toFixed(2)}</td>
                  <td>{r.payout_status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>NO SELLER ORDERS YET</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
