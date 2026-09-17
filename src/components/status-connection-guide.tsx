type Role = "admin-orders" | "admin-fulfilment" | "seller" | "fulfilment";

const guides: Record<Role, Array<[string, string, string, string]>> = {
  seller: [
    [
      "ORDER CONFIRMED",
      "Read only",
      "OVERSTOCK has checked and confirmed the customer order.",
      "The Start Order button becomes available to the seller.",
    ],
    [
      "ORDER STARTED",
      "Seller button",
      "The seller is buying, sourcing, or preparing the product.",
      "Admin sees the same live progress immediately.",
    ],
    [
      "PRODUCT SENT",
      "Seller button",
      "The seller has sent the package to the fulfilment warehouse.",
      "The order becomes ready for admin to assign to a team member.",
    ],
    [
      "PACKAGE RECEIVED → DELIVERED",
      "Read only",
      "The assigned fulfilment team completes the warehouse stages.",
      "Every fulfilment update is shown automatically to the seller and admin.",
    ],
  ],
  fulfilment: [
    [
      "PRODUCT SENT",
      "Read only",
      "The seller sent the package; it is waiting for admin assignment.",
      "The order appears in a team member's workspace only after assignment.",
    ],
    [
      "PACKAGE RECEIVED",
      "Fulfilment button",
      "The assigned team member physically received the package.",
      "Seller and admin see receipt confirmation immediately.",
    ],
    [
      "QC PASSED",
      "Fulfilment button",
      "The product passed the warehouse quality check.",
      "Seller and admin see that it is cleared for dispatch.",
    ],
    [
      "SHIPPED TO COURIER",
      "Fulfilment button",
      "The completed parcel was handed to the customer courier.",
      "All roles see it as shipped; customer tracking can be connected later.",
    ],
    [
      "DELIVERED",
      "Fulfilment button",
      "The courier delivered the customer order.",
      "The shared order journey is complete for every role.",
    ],
  ],
  "admin-orders": [
    [
      "NEW ORDER",
      "Admin confirm button",
      "Payment and the order have been recorded; entry is manual for now.",
      "Seller cannot start until admin presses Confirm Order.",
    ],
    [
      "ORDER CONFIRMED",
      "Admin",
      "OVERSTOCK has accepted and checked the order.",
      "Seller sees the order and receives the Start Order action.",
    ],
    [
      "ORDER STARTED",
      "Seller",
      "The seller is sourcing or preparing the product.",
      "The update appears for admin immediately.",
    ],
    [
      "PRODUCT SENT",
      "Seller",
      "The seller sent the package to the warehouse.",
      "It becomes Ready to Assign; admin assigns one fulfilment team member.",
    ],
    [
      "PACKAGE RECEIVED",
      "Fulfilment",
      "The assigned team member received the seller package.",
      "Admin and seller see warehouse receipt immediately.",
    ],
    [
      "QC PASSED",
      "Fulfilment",
      "The warehouse quality check is complete.",
      "The order is cleared for customer dispatch.",
    ],
    [
      "SHIPPED TO COURIER",
      "Fulfilment",
      "The parcel was handed to the customer courier.",
      "Every dashboard shows shipped; customer tracking comes later.",
    ],
    [
      "DELIVERED",
      "Fulfilment",
      "The customer order was delivered.",
      "The shared operational journey is complete.",
    ],
  ],
  "admin-fulfilment": [
    [
      "PRODUCT SENT",
      "Seller button",
      "The seller has sent the package to the warehouse.",
      "This is the admin's Ready to Assign queue.",
    ],
    [
      "TEAM ASSIGNED",
      "Admin assignment",
      "Admin selects the responsible fulfilment team member.",
      "The order appears in that member's workspace; this is not a journey status.",
    ],
    [
      "PACKAGE RECEIVED",
      "Fulfilment button",
      "The assigned team member received the package.",
      "Admin and seller see receipt immediately.",
    ],
    [
      "QC PASSED",
      "Fulfilment button",
      "The product passed the warehouse quality check.",
      "The order is cleared for dispatch.",
    ],
    [
      "SHIPPED TO COURIER → DELIVERED",
      "Fulfilment buttons",
      "The team hands off the parcel, then records final delivery.",
      "Both updates are shared with admin and seller automatically.",
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
