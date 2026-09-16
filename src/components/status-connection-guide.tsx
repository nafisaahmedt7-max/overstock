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
      "CANCELLED",
      "Admin override",
      "Order was stopped before completion.",
      "Seller and fulfilment records update automatically.",
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
      "DELIVERED",
      "Fulfilment or admin",
      "Shipment finished successfully.",
      "All connected views receive the result.",
    ],
  ],
};

function tone(status: string) {
  if (status.includes("CANCEL") || status.includes("HOLD")) return "attention";
  if (status.includes("DELIVERED") || status.includes("PASSED"))
    return "complete";
  if (status.includes("SHIPPED") || status.includes("TRANSIT"))
    return "transit";
  if (status.includes("PACK")) return "packing";
  if (status.includes("RECEIVED")) return "received";
  if (status.includes("CONFIRMED")) return "confirmed";
  return "waiting";
}

export function StatusConnectionGuide({
  role,
  title = "HOW THIS PAGE CONNECTS",
}: {
  role: Role;
  title?: string;
}) {
  return (
    <details className="connection-guide collapsible-guide">
      <summary>{title}</summary>
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
                <td data-status={tone(status)}>{status}</td>
                <td>{control}</td>
                <td>{meaning}</td>
                <td>{result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
