type Role = "admin-orders" | "admin-fulfilment" | "seller" | "fulfilment";

const guides: Record<Role, Array<[string, string, string, string]>> = {
  seller: [
    [
      "AWAITING SELLER",
      "Read only",
      "Confirm that the item is available.",
      "Admin and fulfilment see that seller action is required.",
    ],
    [
      "SELLER CONFIRMED",
      "Seller selects",
      "Item is available and being prepared.",
      "Admin and fulfilment immediately see it as confirmed.",
    ],
    [
      "INBOUND TRANSIT",
      "Seller selects",
      "Parcel is travelling to OVERSTOCK.",
      "Inbound courier and tracking become visible to admin and fulfilment.",
    ],
    [
      "RECEIVED → DELIVERED",
      "Read only",
      "Progress completed by OVERSTOCK.",
      "Updates automatically when the internal fulfilment team changes status.",
    ],
  ],
  fulfilment: [
    [
      "AWAITING / CONFIRMED / INBOUND",
      "Read only",
      "Seller is preparing or sending the parcel.",
      "Seller changes it; admin sees the same status.",
    ],
    [
      "RECEIVED",
      "Fulfilment selects",
      "Parcel physically arrived.",
      "Seller and admin immediately see receipt confirmation.",
    ],
    [
      "QC HOLD / QC PASSED",
      "Fulfilment selects",
      "Inspection failed or passed.",
      "Seller and admin immediately see the quality outcome.",
    ],
    [
      "READY / PACKED",
      "Fulfilment selects",
      "Customer parcel is being prepared.",
      "Main admin order automatically changes to Packing.",
    ],
    [
      "SHIPPED / DELIVERED",
      "Fulfilment selects",
      "Customer parcel left or arrived.",
      "Main order and seller view automatically change to Shipped or Delivered.",
    ],
  ],
  "admin-orders": [
    [
      "NEW",
      "Admin selects",
      "Order has just been recorded.",
      "Seller work begins when seller items generate packages.",
    ],
    [
      "CONFIRMED",
      "Admin or automation",
      "Supply is confirmed.",
      "Seller feed and fulfilment order show Confirmed.",
    ],
    [
      "PACKING",
      "Admin or fulfilment",
      "All required items can be packed.",
      "Fulfilment records and seller progress update.",
    ],
    [
      "SHIPPED / DELIVERED",
      "Admin or fulfilment",
      "Customer shipment left or arrived.",
      "Every dashboard receives the same final progress.",
    ],
    [
      "CANCELLED / RETURNED",
      "Admin override",
      "Order stopped or came back.",
      "Seller and fulfilment records update for resolution.",
    ],
  ],
  "admin-fulfilment": [
    [
      "AWAITING → INBOUND",
      "Seller controls",
      "Seller confirmation and seller-to-OVERSTOCK tracking.",
      "Visible here automatically; admin may override.",
    ],
    [
      "RECEIVED → QC PASSED",
      "Fulfilment controls",
      "Internal receipt and inspection.",
      "Seller and admin order progress update automatically.",
    ],
    [
      "READY → PACKED",
      "Fulfilment or admin",
      "Customer shipment preparation.",
      "Main order becomes Packing.",
    ],
    [
      "OUTBOUND SHIPPED",
      "Fulfilment or admin",
      "OVERSTOCK-to-customer tracking is active.",
      "Main order and seller view become Shipped.",
    ],
    [
      "DELIVERED / RETURNED",
      "Fulfilment or admin",
      "Shipment finished or returned.",
      "All connected views receive the result.",
    ],
  ],
};

export function StatusConnectionGuide({
  role,
  title = "HOW THIS PAGE CONNECTS",
}: {
  role: Role;
  title?: string;
}) {
  return (
    <section className="connection-guide">
      <p className="eyebrow">LIVE SHARED STATUS</p>
      <h2>{title}</h2>
      <div>
        <table>
          <thead>
            <tr>
              <th>STATUS</th>
              <th>CONTROL</th>
              <th>MEANING HERE</th>
              <th>AUTOMATIC RESULT</th>
            </tr>
          </thead>
          <tbody>
            {guides[role].map(([status, control, meaning, result]) => (
              <tr key={status}>
                <td>{status}</td>
                <td>{control}</td>
                <td>{meaning}</td>
                <td>{result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
