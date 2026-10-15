import { notFound } from "next/navigation";

type LegalSection = { heading: string; paragraphs: string[] };
type LegalContent = {
  title: string;
  copy?: string[];
  sections?: LegalSection[];
  updated?: string;
};

const pages: Record<string, LegalContent> = {
  terms: {
    title: "TERMS AND CONDITIONS",
    updated: "Last updated October 15, 2026",
    sections: [
      {
        heading: "Using OVERSTOCK",
        paragraphs: [
          "These terms apply when you use the OVERSTOCK website or place an order through it. By using the site or placing an order, you agree to these terms. You must provide accurate contact, payment, and delivery information and use the site lawfully.",
          "OVERSTOCK lists products supplied by OVERSTOCK and participating independent sellers. Product details and your order information identify the seller for an item where applicable. If you are unsure who is supplying an item, contact us before ordering.",
        ],
      },
      {
        heading: "Products and orders",
        paragraphs: [
          "We aim to describe products and show images accurately. Colours and appearance can vary between screens. Product availability can change, and adding an item to your cart does not guarantee it will remain available.",
          "Submitting an order is a request to buy the listed items. An order is accepted after payment is completed and OVERSTOCK sends an order confirmation. If an item is unavailable or a clear pricing or listing error affects an order, we may contact you to arrange a correction, cancellation, or refund.",
          "During checkout, stock may be held for up to 30 minutes while you complete payment. If payment is not completed in that time, the hold expires and the stock may become available to other customers.",
        ],
      },
      {
        heading: "Prices and payment",
        paragraphs: [
          "Prices on the site may be shown in a selected display currency. The Square hosted checkout shows the payment amount in Australian dollars (AUD); check that amount before authorising payment. Your card issuer may apply its own exchange rate or foreign transaction fee.",
          "Payments are processed through Square. Payment details entered on Square's hosted checkout are handled under Square's own terms and privacy information.",
        ],
      },
      {
        heading: "Delivery",
        paragraphs: [
          "Delivery options, destinations, and any delivery charges are shown during checkout or described on our Shipping page. Please provide a complete and accurate address. Delivery estimates are estimates and may change because of courier or other events outside our control.",
          "For shipping updates and tracking information, see our Shipping page and the updates sent with your order. This does not limit any rights you have under applicable consumer law.",
        ],
      },
      {
        heading: "Cancellations, returns, and consumer rights",
        paragraphs: [
          "Our Refund Policy explains our change-of-mind policy and how to contact us about an order problem. A change-of-mind return is not available unless our Refund Policy or the product listing says otherwise.",
          "Nothing in these terms excludes, restricts, or modifies a consumer guarantee or other right that cannot lawfully be excluded. If a product does not meet a consumer guarantee, you may be entitled to a remedy required by law.",
        ],
      },
      {
        heading: "Website use and content",
        paragraphs: [
          "You must not misuse the site, interfere with its operation, attempt unauthorised access, or use it to commit fraud or break the law. OVERSTOCK and its licensors retain rights in the site's design, text, and other content. Product names, images, and other materials may belong to their respective owners or sellers.",
        ],
      },
      {
        heading: "Changes and contact",
        paragraphs: [
          "We may update these terms as the site or our services change. The version displayed when you place an order applies to that order, subject to rights that apply by law.",
          "For questions about these terms or an order, contact us through the Contact page and include your order number when relevant. Do not send passwords or full payment-card details.",
        ],
      },
    ],
  },
  privacy: {
    title: "PRIVACY",
    copy: [
      "We collect the information needed to manage accounts, orders, delivery and seller payments.",
      "Order information is only shown to authorised OVERSTOCK administrators, the relevant seller and the internal fulfillment team where required.",
      "Contact us to request access or correction of your personal information.",
    ],
  },
  shipping: {
    title: "SHIPPING",
    copy: [
      "Independent sellers send sold products to OVERSTOCK fulfillment. After receipt and preparation, OVERSTOCK sends the customer parcel.",
      "Tracking is added when available. Delivery estimates are not guarantees and may vary by destination and courier.",
    ],
  },
  refunds: {
    title: "REFUND POLICY",
    copy: [
      "We do not offer returns or refunds for change of mind unless a product listing or another written offer says otherwise.",
      "This policy does not limit your rights under applicable consumer law. If a product is faulty, not as described, or otherwise does not meet a consumer guarantee, you may be entitled to a remedy required by law. Contact us through the Contact page so we can assess the issue.",
    ],
  },
  contact: {
    title: "CONTACT",
    copy: [
      "For orders, seller onboarding or privacy requests, contact OVERSTOCK through the official WhatsApp or social account used during onboarding.",
      "Include your order number, but never send passwords or full payment details.",
    ],
  },
};

export default async function LegalPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const content = pages[page];
  if (!content) notFound();

  return (
    <main className="legal-page">
      <p className="eyebrow">OVERSTOCK / HELP</p>
      <h1>{content.title}</h1>
      {content.updated && <p className="legal-updated">{content.updated}</p>}
      {content.copy?.map((text) => <p key={text}>{text}</p>)}
      {content.sections?.map((section) => (
        <section className="legal-section" key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((text) => <p key={text}>{text}</p>)}
        </section>
      ))}
    </main>
  );
}
