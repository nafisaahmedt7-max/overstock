export const JOURNEY = [
  ["order_placed", "New order"],
  ["admin_confirmed", "Order confirmed"],
  ["seller_preparing", "Seller preparing order"],
  ["sent_to_fulfillment", "Package sent to fulfilment"],
  ["awaiting_package", "Awaiting package"],
  ["received_by_fulfillment", "Package received"],
  ["qc_ongoing", "QC ongoing"],
  ["package_prepared", "Package prepared"],
  ["sent_to_customer", "Package sent to courier"],
  ["package_in_transit", "Package in transit (GPO)"],
  ["delivered", "Package delivered"],
] as const;

export type JourneyStatus = (typeof JOURNEY)[number][0] | "cancelled";
export function journeyLabel(status: JourneyStatus) {
  return status === "cancelled"
    ? "Cancelled"
    : JOURNEY.find(([key]) => key === status)?.[1] || status.replaceAll("_", " ");
}

export function OrderTimeline({
  status,
  timestamps = {},
}: {
  status: JourneyStatus;
  timestamps?: Record<string, string>;
}) {
  const current = JOURNEY.findIndex(([key]) => key === status);
  return (
    <ol className="order-timeline" aria-label="Order progress">
      {JOURNEY.map(([key, label], index) => {
        const state = status === "cancelled" ? "upcoming" : index < current ? "done" : index === current ? "current" : "upcoming";
        return (
          <li key={key} data-state={state} data-step-status={key}>
            <i aria-hidden="true" />
            <div><b>{label}</b>{timestamps[key] && <time>{new Date(timestamps[key]).toLocaleString("en-AU")}</time>}</div>
          </li>
        );
      })}
      {status === "cancelled" && <li data-state="cancelled"><i /><div><b>Cancelled</b></div></li>}
    </ol>
  );
}

export function TrackingGuide({ role }: { role: "admin" | "seller" | "fulfillment" }) {
  return (
    <details className="tracking-guide">
      <summary>How does order tracking work?</summary>
      <div>
        <p>There is one shared order journey. A change made here appears for every authorised role.</p>
        {role === "admin" && <p><b>Admin:</b> confirms new orders, assigns packages to one team member, can correct any stage, and is the only role allowed to cancel.</p>}
        {role === "seller" && <p><b>Seller:</b> after “Order confirmed,” press “Seller preparing order.” When the package leaves for the warehouse, add inbound details and press “Package sent to fulfilment.”</p>}
        {role === "fulfillment" && <p><b>Fulfillment:</b> only assigned orders appear here. Complete Package received → QC ongoing → Package prepared → Sent to courier → In transit → Delivered.</p>}
      </div>
    </details>
  );
}
