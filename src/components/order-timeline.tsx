export const JOURNEY = [
  ["order_placed", "New order"],
  ["admin_confirmed", "Order confirmed"],
  ["seller_preparing", "Order started"],
  ["sent_to_fulfillment", "Product sent / ready to assign"],
  ["received_by_fulfillment", "Package received"],
  ["preparing_for_customer", "QC passed"],
  ["sent_to_customer", "Shipped to courier"],
  ["delivered", "Delivered"],
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
          <li key={key} data-state={state}>
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
        {role === "admin" && <p><b>Admin:</b> confirms the new order with its dedicated button, assigns the product-sent package to a team member, and can correct the shared journey.</p>}
        {role === "seller" && <p><b>Seller:</b> after “Order confirmed,” press “Start order.” When the package leaves for the warehouse, add inbound details and press “Product sent.”</p>}
        {role === "fulfillment" && <p><b>Fulfillment:</b> only assigned orders appear here. Press “Package received,” “QC passed,” “Shipped to courier,” and finally “Delivered.”</p>}
      </div>
    </details>
  );
}
