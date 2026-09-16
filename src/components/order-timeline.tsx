export const JOURNEY = [
  ["order_placed", "Order placed"],
  ["admin_confirmed", "Confirmed by admin"],
  ["seller_preparing", "Seller preparing"],
  ["sent_to_fulfillment", "Sent to fulfillment"],
  ["received_by_fulfillment", "Received by fulfillment"],
  ["preparing_for_customer", "Preparing for customer"],
  ["sent_to_customer", "Sent to customer"],
  ["delivered", "Delivered"],
] as const;

export type JourneyStatus = (typeof JOURNEY)[number][0] | "cancelled";

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
        {role === "admin" && <p><b>Admin:</b> confirms new orders and can correct any stage. Seller actions and fulfillment actions appear automatically.</p>}
        {role === "seller" && <p><b>Seller:</b> after admin confirmation, choose “Start preparing”, then add courier/tracking and choose “Mark sent to fulfillment”.</p>}
        {role === "fulfillment" && <p><b>Fulfillment:</b> record receipt, prepare the customer parcel, add outbound tracking, then mark dispatched and delivered.</p>}
      </div>
    </details>
  );
}
