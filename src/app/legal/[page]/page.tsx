import { notFound } from "next/navigation";

type LegalSection = { heading: string; paragraphs: string[] };
type LegalContent = {
  title: string;
  copy?: string[];
  sections?: LegalSection[];
  updated?: string;
};

const contactOptions = [
  {
    label: "EMAIL",
    href: process.env.NEXT_PUBLIC_CONTACT_EMAIL
      ? `mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL.trim()}`
      : "",
    value: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "Support email to be added",
  },
  {
    label: "FACEBOOK",
    href: process.env.NEXT_PUBLIC_FACEBOOK_URL?.trim() || "",
    value: process.env.NEXT_PUBLIC_FACEBOOK_URL?.trim() || "Facebook profile link to be added",
  },
  {
    label: "INSTAGRAM",
    href: process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || "",
    value: process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || "Instagram profile link to be added",
  },
];

const pages: Record<string, LegalContent> = {
  terms: {
    title: "TERMS AND CONDITIONS",
    updated: "Last updated October 15, 2026",
    sections: [
      {
        heading: "Using OVERSTOCK",
        paragraphs: [
          "These terms apply when you use the OVERSTOCK website or place an order through it. By using the site or placing an order, you agree to these terms. You must provide accurate contact, payment, and delivery information and use the site lawfully.",
          "OVERSTOCK is an Australian-based online retailer selling to customers in the United States and other destinations supported by checkout.",
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
          "Please review the delivery information available before placing an order and provide a complete, accurate address. Delivery estimates may change because of courier or other events outside our control. If we cannot ship within the time stated for your order, we will contact you and provide the options required by applicable law.",
          "For shipping updates and tracking information, see our Shipping page and the updates sent with your order. This does not limit any rights you have under applicable consumer law.",
        ],
      },
      {
        heading: "Cancellations, returns, and consumer rights",
        paragraphs: [
          "Before shipment, you may email us to request cancellation. If we confirm the order can be stopped before dispatch, we will cancel it and refund the payment to the original payment method. Once an order has shipped, we do not accept cancellation or returns for change of mind.",
          "If an item arrives damaged, contact us by email through the Contact page with your order number and photos of the item and packaging. We will review the issue and may offer a voucher where permitted by applicable law. A voucher does not replace a refund, replacement, or other remedy that applicable law requires or gives you the right to choose. Many items are one of one, so an identical replacement may not be available; this does not limit your legal rights.",
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
      "You may request cancellation by email before your order is shipped. If we confirm we can stop the order before dispatch, we will cancel it and refund the payment to the original payment method. Once an order has shipped, we do not accept cancellations or returns for change of mind.",
      "If an item arrives damaged, email us with your order number and photos of the item and packaging. We will review the issue and may offer a voucher where permitted by applicable law. A voucher does not replace a refund, replacement, or other remedy that applicable law requires or gives you the right to choose. Many items are one of one, so an identical replacement may not be available; this does not limit your legal rights.",
      "Nothing in this policy limits rights that cannot lawfully be excluded, including consumer guarantees and remedies that may apply under Australian or U.S. law.",
    ],
  },
  contact: {
    title: "CONTACT",
    copy: [
      "Choose email, Facebook, or Instagram below to contact OVERSTOCK. For an order issue, include your order number and photos if the item arrived damaged. Never send passwords or full payment-card details.",
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
      {page === "contact" && (
        <section className="contact-options" aria-label="Contact options">
          {contactOptions.map((option) => (
            <div className="contact-option" key={option.label}>
              <h2>{option.label}</h2>
              {option.href ? (
                <a
                  href={option.href}
                  target={option.label === "EMAIL" ? undefined : "_blank"}
                  rel={option.label === "EMAIL" ? undefined : "noreferrer"}
                >
                  {option.value}
                </a>
              ) : (
                <span>{option.value}</span>
              )}
            </div>
          ))}
        </section>
      )}
      {content.sections?.map((section) => (
        <section className="legal-section" key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((text) => <p key={text}>{text}</p>)}
        </section>
      ))}
    </main>
  );
}
