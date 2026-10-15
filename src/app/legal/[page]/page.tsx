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
    href: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim()
      ? `mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL.trim()}`
      : "mailto:operations.overstock@gmail.com",
    value: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "operations.overstock@gmail.com",
  },
  {
    label: "FACEBOOK",
    href: process.env.NEXT_PUBLIC_FACEBOOK_URL?.trim() || "",
    value: process.env.NEXT_PUBLIC_FACEBOOK_URL?.trim() || "Facebook profile coming soon",
  },
  {
    label: "INSTAGRAM",
    href: process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || "https://www.instagram.com/overstock.bd/",
    value: "@overstock.bd",
  },
  {
    label: "ADDRESS",
    href: "",
    value: "24 Eolian Loop, Clayton, Sydney",
  },
];

const pages: Record<string, LegalContent> = {
  terms: {
    title: "TERMS AND CONDITIONS",
    updated: "Last updated October 15, 2026",
    sections: [
      {
        heading: "About these terms",
        paragraphs: [
          "These Terms and Conditions govern your use of the OVERSTOCK website and purchases made through it. The contracting business is [insert registered legal business name], trading as OVERSTOCK, ABN/ACN [insert]. Its business address is 24 Eolian Loop, Clayton, Sydney, [insert State or Territory and postcode], Australia.",
          "By using the website or placing an order, you agree to these terms. If you place an order for another person or business, you confirm that you are authorised to do so. These terms apply alongside the Privacy, Shipping, and Refund pages published on our website.",
        ],
      },
      {
        heading: "Products and listings",
        paragraphs: [
          "We aim to provide accurate product descriptions, condition details, measurements, and photographs. Please read the individual listing before ordering. Screen settings may affect how colours appear. Any known fault, wear, or other material condition disclosed in the listing forms part of the product description.",
          "Many products are limited or one of one. Availability may change, and placing an item in your cart does not mean an order has been accepted. If an item is unavailable or a listing contains a material error, we will contact you to correct the issue or cancel the affected order. If we cancel after payment, we will refund the amount paid for that order, subject to any remedy required by law.",
        ],
      },
      {
        heading: "Orders and payment",
        paragraphs: [
          "Submitting an order is an offer to buy the listed products. We accept an order when payment has been authorised and we send an order confirmation. Please check the confirmation and contact us promptly if you believe it contains an error.",
          "The website may display prices in U.S. dollars (USD). Square's hosted checkout displays the amount charged in Australian dollars (AUD). Review the amount shown by Square before authorising payment. Your bank or card issuer may apply its own exchange rate or transaction fees.",
          "Payments are processed through Square. Payment information entered on Square's hosted checkout is handled under Square's applicable terms and privacy information. We may decline or cancel an order where permitted by law, including where payment is not authorised, an item is unavailable, or a material listing or pricing error has occurred. If we cancel a paid order, we will arrange a refund to the original payment method unless the law requires another remedy.",
        ],
      },
      {
        heading: "Dispatch and delivery",
        paragraphs: [
          "Our current dispatch timeframe is typically 3–4 weeks after your order is accepted. Dispatch means handing the parcel to the delivery carrier; it is not the delivery date. Carrier transit time follows dispatch and can vary by destination and carrier.",
          "Please provide a complete delivery address and check it carefully before submitting your order. Contact us as soon as possible if you need to correct an address. We cannot guarantee a change after an order has entered dispatch.",
          "If we cannot dispatch within the timeframe stated for your order, we will contact you with the revised information and the options required by applicable law. For U.S. orders, the Federal Trade Commission's Mail, Internet, or Telephone Order Merchandise Rule requires shipment within the stated timeframe or, if none is stated, generally within 30 days. When a delay occurs, the Rule requires an option to consent to the delay or cancel for a prompt refund.",
          "We remain responsible for addressing an order that is lost, delayed, or damaged in transit in accordance with applicable consumer law. Nothing in this section limits your legal rights.",
        ],
      },
      {
        heading: "Final sale and cancellations",
        paragraphs: [
          "All sales are final for change of mind. Because many OVERSTOCK items are low-cost, limited, or one of one, we do not offer change-of-mind returns or exchanges after dispatch.",
          "You may email us at operations.overstock@gmail.com to request cancellation before your order is dispatched. A cancellation is effective only when we confirm it. If the order is cancelled before dispatch, we will refund the amount paid to the original payment method. This policy does not restrict a cancellation or refund right provided by consumer law, including a right that applies when an order cannot be shipped on time.",
        ],
      },
      {
        heading: "Incorrect, damaged, or faulty items",
        paragraphs: [
          "If an item is incorrect, arrives damaged, or has a fault not disclosed in its listing, email operations.overstock@gmail.com promptly. Include your order number, a short description, and clear photographs where relevant. We will review the issue and work with you to resolve it.",
          "For a confirmed damage issue, we will offer a voucher as a resolution where permitted by law. You do not have to accept a voucher where applicable law gives you a different remedy or choice. A voucher will not replace any repair, replacement, refund, or other remedy required by law. An identical replacement may not be available for a one-of-one item, but this does not limit your legal rights.",
          "A remedy may not be available where the issue was caused by misuse, accidental damage after delivery, or a condition clearly disclosed before purchase, subject to any rights that cannot lawfully be excluded.",
        ],
      },
      {
        heading: "Consumer guarantees and other legal rights",
        paragraphs: [
          "Australian consumers receive the protections of the Australian Consumer Law in Schedule 2 to the Competition and Consumer Act 2010 (Cth). Those protections cannot be excluded. Depending on the circumstances, a consumer may be entitled to a repair, replacement, refund, cancellation, or compensation. For a major product failure, the consumer may choose a refund or replacement.",
          "U.S. consumers retain rights under applicable federal and state consumer protection laws. The shipping-delay rights described in these terms apply in addition to any other non-waivable rights available to you.",
          "Nothing in these terms excludes, restricts, or modifies any consumer guarantee, statutory right, or remedy that cannot lawfully be excluded, restricted, or modified. If these terms differ from a mandatory legal protection, the mandatory protection prevails.",
        ],
      },
      {
        heading: "Website use and intellectual property",
        paragraphs: [
          "You may use the website for lawful personal browsing and purchasing. You must not interfere with its operation, attempt unauthorised access, introduce malicious code, misuse another person's information, or use the website for fraud or another unlawful purpose.",
          "The website's design, text, graphics, photographs, and other content are owned by or licensed to OVERSTOCK and are protected by applicable intellectual property laws. You may not reproduce or commercially use that content without permission, except as allowed by law.",
        ],
      },
      {
        heading: "Third-party services and privacy",
        paragraphs: [
          "Checkout and payment processing are provided through Square, and delivery may be performed by independent carriers. Third-party services are subject to their own terms and privacy practices. This does not reduce OVERSTOCK's obligations to you under these terms or applicable law.",
          "Our collection and use of personal information is described in the Privacy page. Please review it before placing an order.",
        ],
      },
      {
        heading: "Liability",
        paragraphs: [
          "Nothing in these terms excludes or limits a right, guarantee, remedy, or liability that cannot lawfully be excluded or limited. Subject to that protection and to the extent permitted by law, we are not responsible for loss caused by unlawful use of the website or events outside our reasonable control.",
        ],
      },
      {
        heading: "Governing law and disputes",
        paragraphs: [
          "These terms are governed by the laws of [insert Australian State or Territory], subject to any mandatory consumer protection laws that apply where you live. A governing-law term does not remove rights that cannot lawfully be excluded. Before starting a formal dispute, you may contact us by email so we can try to resolve the issue. This does not prevent you from contacting a regulator, using a statutory dispute process, or bringing a claim in a forum available to you by law.",
        ],
      },
      {
        heading: "Changes and general terms",
        paragraphs: [
          "We may update these terms from time to time. The terms in effect when you place an order apply to that order, subject to mandatory legal rights. If a provision is found unenforceable, it will be applied to the extent permitted by law or severed, and the remaining provisions will continue to apply.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [
          "For questions about these terms or an order, email operations.overstock@gmail.com. Our address is 24 Eolian Loop, Clayton, Sydney, [insert State or Territory and postcode], Australia. Include your order number when relevant. Do not send passwords or full payment-card details.",
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
      "Our current dispatch timeframe is typically 3–4 weeks after an order is accepted. Dispatch means handing the parcel to the delivery carrier. Delivery time follows dispatch and varies by destination and carrier.",
      "Please provide a complete and accurate delivery address at checkout. We will send order and dispatch updates to the email address provided with your order.",
      "If we cannot dispatch within the timeframe stated for your order, we will contact you with the revised information and any options required by law. For U.S. orders, federal rules generally require shipment within the promised timeframe or within 30 days if no timeframe is stated, and require a delay notice with the option to accept the delay or cancel for a prompt refund.",
      "If an order is lost, delayed, or arrives damaged, email operations.overstock@gmail.com with your order number and details. Nothing on this page limits your rights under applicable consumer law.",
    ],
  },
  refunds: {
    title: "REFUND POLICY",
    copy: [
      "All sales are final for change of mind. You may email operations.overstock@gmail.com to request cancellation before your order is dispatched. The cancellation takes effect when we confirm it. If we confirm the order can be cancelled before dispatch, we will refund the amount paid to the original payment method.",
      "After dispatch, we do not accept change-of-mind cancellations, returns, or exchanges. This does not restrict a refund, cancellation, replacement, repair, or other remedy required by law.",
      "If an item is incorrect, arrives damaged, or has a fault that was not disclosed before purchase, email us promptly at operations.overstock@gmail.com. Include your order number, a short description, and clear photos where relevant. For a confirmed damage issue, we will offer a voucher where permitted by law. You do not have to accept a voucher if applicable law gives you a different remedy or choice.",
      "Australian Consumer Law guarantees cannot be excluded. For U.S. customers, applicable federal and state consumer protections continue to apply, including rights relating to shipping delays. Nothing in this policy limits rights or remedies that applicable law does not allow us to exclude.",
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
