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
          "Please review the delivery information available before placing an order and provide a complete, accurate address. We ship within the timeframe stated for your order or, if no timeframe is stated, within the period required by law. If we cannot ship on time, we will give you the notice and options required by applicable law, which may include agreeing to a delay or cancelling for a full refund.",
          "For shipping updates and tracking information, see our Shipping page and the updates sent with your order. Delivery estimates may change because of courier or other events outside our control. This does not limit any rights you have under applicable consumer law.",
        ],
      },
      {
        heading: "Cancellations, damaged items, and consumer rights",
        paragraphs: [
          "You may email us to request cancellation before your order ships. If we confirm we can cancel it before dispatch, we will cancel the order and refund the amount paid for it to the original payment method. After an order ships, we do not accept cancellations or returns for change of mind. This policy does not limit a right to cancel or receive a refund where applicable law provides one.",
          "If an item arrives damaged, email us through the Contact page promptly with your order number and photos of the item and packaging. We will review the issue and may offer a voucher as a resolution where permitted by law and accepted by you. A voucher will not replace a repair, replacement, refund, or other remedy required by law. Under the Australian Consumer Law, the remedy depends on the problem and may include a free repair or, for a major failure, your choice of a refund or replacement. Many items are one of one, so an identical replacement may not be available; this does not limit your legal rights.",
        ],
      },
      {
        heading: "Consumer law",
        paragraphs: [
          "For Australian consumers, the Australian Consumer Law in Schedule 2 to the Competition and Consumer Act 2010 (Cth) provides consumer guarantees that cannot be excluded. Nothing in these terms excludes, restricts, or modifies those guarantees or any remedy available under them.",
          "For U.S. consumers, applicable federal and state consumer protection laws continue to apply. Under the U.S. Federal Trade Commission's Mail, Internet, or Telephone Order Merchandise Rule, we will meet the shipping time stated when you order or, if none is stated, the applicable 30-day period. If we cannot do so, we will provide the notice and cancellation/refund options required by that Rule.",
          "These terms are subject to any mandatory consumer protections that apply to your purchase. If a term conflicts with a non-excludable legal right, that right prevails to the extent of the conflict.",
        ],
      },
      {
        heading: "Website use and content",
        paragraphs: [
          "You must not misuse the site, interfere with its operation, attempt unauthorised access, or use it to commit fraud or break the law. OVERSTOCK and its licensors retain rights in the site's design, text, and other content. Product names, images, and other materials remain subject to the rights of their respective owners.",
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
      "We collect the information needed to manage customer accounts, orders, delivery, and support.",
      "We use order information to process purchases, arrange delivery, and respond to customer requests. Access is limited to people who need the information for these purposes.",
      "Contact us to request access to or correction of your personal information.",
    ],
  },
  shipping: {
    title: "SHIPPING",
    copy: [
      "OVERSTOCK prepares and sends customer parcels to the delivery address provided at checkout.",
      "Tracking is added when available. Delivery estimates are not guarantees and may vary by destination and courier. If we cannot ship within the timeframe stated for your order, we will provide the notice and options required by applicable law.",
    ],
  },
  refunds: {
    title: "REFUND POLICY",
    copy: [
      "You may request cancellation by email before your order ships. If we confirm we can stop it before dispatch, we will cancel the order and refund the amount paid to the original payment method. After an order ships, we do not offer cancellations or returns for change of mind. This does not limit any cancellation or refund right that applicable law gives you.",
      "If an item arrives damaged, email us promptly with your order number and photos of the item and packaging. We will review the issue and may offer a voucher as a resolution where permitted by law and accepted by you. A voucher will not replace any repair, replacement, refund, or other remedy required by law. Many items are one of one, so an identical replacement may not be available; this does not limit your legal rights.",
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
