type Role = "admin-orders" | "admin-fulfilment" | "seller" | "fulfilment";

const guides: Record<Role, Array<[string, string, string, string]>> = {
  seller: [
    [
      "ORDER CONFIRMED",
      "Read only",
      "OVERSTOCK has checked and confirmed the customer order.",
      "The Seller Preparing Order button becomes available.",
    ],
    [
      "SELLER PREPARING ORDER",
      "Seller button",
      "The seller is buying, sourcing, or preparing the product.",
      "Admin sees the same live progress immediately.",
    ],
    [
      "PACKAGE SENT TO FULFILMENT",
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
    [
      "CANCELLATION REQUEST",
      "Seller request",
      "The seller can alert admin that the order should be reviewed.",
      "The order stays active unless admin confirms cancellation.",
    ],
  ],
  fulfilment: [
    [
      "AWAITING PACKAGE",
      "Read only",
      "Admin assigned this order to the signed-in team member.",
      "The order now appears in only that team member's workspace.",
    ],
    [
      "PACKAGE RECEIVED",
      "Fulfilment button",
      "The assigned team member physically received the package.",
      "Seller and admin see receipt confirmation immediately.",
    ],
    [
      "QC ONGOING",
      "Fulfilment button",
      "The assigned team member started the quality check.",
      "Seller and admin see that inspection is in progress.",
    ],
    [
      "PACKAGE PREPARED",
      "Fulfilment button",
      "Quality checks are complete and the parcel is prepared.",
      "The package is ready to be handed to the courier.",
    ],
    [
      "PACKAGE SENT TO COURIER",
      "Fulfilment button",
      "The completed parcel was handed to the customer courier.",
      "All roles see it as shipped; customer tracking can be connected later.",
    ],
    [
      "PACKAGE IN TRANSIT (GPO)",
      "Fulfilment button",
      "The courier has the package and it is moving to the customer.",
      "Admin and seller see the live delivery stage.",
    ],
    [
      "PACKAGE DELIVERED",
      "Fulfilment button",
      "The courier delivered the customer order.",
      "The shared order journey is complete for every role.",
    ],
    [
      "CANCELLATION REQUEST",
      "Fulfilment request",
      "The team can alert admin when the order cannot continue.",
      "Only admin can confirm and apply the red Cancelled status.",
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
      "Seller sees the order and receives the Seller Preparing Order action.",
    ],
    [
      "SELLER PREPARING ORDER",
      "Seller",
      "The seller is sourcing or preparing the product.",
      "The update appears for admin immediately.",
    ],
    [
      "PACKAGE SENT TO FULFILMENT",
      "Seller",
      "The seller sent the package to the warehouse.",
      "Admin receives an assignment action; fulfilment cannot see it yet.",
    ],
    [
      "AWAITING PACKAGE",
      "Admin assignment",
      "Admin assigned one fulfilment team member.",
      "The assigned member receives the order automatically.",
    ],
    [
      "PACKAGE RECEIVED",
      "Fulfilment",
      "The assigned team member received the seller package.",
      "Admin and seller see warehouse receipt immediately.",
    ],
    [
      "QC ONGOING → PACKAGE PREPARED",
      "Fulfilment",
      "The warehouse checks and prepares the parcel.",
      "Both changes are shared with admin and seller.",
    ],
    [
      "SENT TO COURIER → IN TRANSIT",
      "Fulfilment",
      "The parcel was handed to the customer courier.",
      "Every dashboard receives both courier stages.",
    ],
    [
      "PACKAGE DELIVERED",
      "Fulfilment",
      "The customer order was delivered.",
      "The shared operational journey is complete.",
    ],
    [
      "SELLER PAYMENT",
      "Admin control",
      "Admin records Not Due, Due, Scheduled, Paid, or Held.",
      "The seller balance and payment record use the same payout status.",
    ],
    [
      "CANCELLATION REQUEST",
      "Admin approval",
      "A seller or fulfilment member requested cancellation.",
      "Admin either keeps the order active or confirms the red Cancelled status.",
    ],
  ],
  "admin-fulfilment": [
    [
      "PACKAGE SENT TO FULFILMENT",
      "Seller button",
      "The seller has sent the package to the warehouse.",
      "This creates the admin's team-assignment action.",
    ],
    [
      "TEAM ASSIGNED",
      "Admin assignment",
      "Admin selects the responsible fulfilment team member.",
      "Status automatically becomes Awaiting Package and appears for that member.",
    ],
    [
      "PACKAGE RECEIVED",
      "Fulfilment button",
      "The assigned team member received the package.",
      "Admin and seller see receipt immediately.",
    ],
    [
      "QC ONGOING → PACKAGE PREPARED",
      "Fulfilment buttons",
      "The team inspects and prepares the parcel.",
      "Both stages update for admin and seller.",
    ],
    [
      "SENT TO COURIER → IN TRANSIT → DELIVERED",
      "Fulfilment buttons",
      "The team hands off the parcel, then records final delivery.",
      "Both updates are shared with admin and seller automatically.",
    ],
    [
      "CANCELLATION REQUEST",
      "Admin approval",
      "Seller or fulfilment can request review but cannot cancel.",
      "Admin confirms cancellation or keeps the shared order active.",
    ],
  ],
};

function tone(status: string) {
  if (status.includes("CANCEL") || status.includes("HOLD")) return "attention";
  if (status.includes("SELLER PREPARING") || status.includes("SENT TO FULFILMENT")) return "seller_preparing";
  if (status.includes("NEW ORDER") || status.includes("ORDER CONFIRMED") || status.includes("TEAM ASSIGNED") || status.includes("AWAITING PACKAGE")) return "admin_confirmed";
  return "received_by_fulfillment";
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
