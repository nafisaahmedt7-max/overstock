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
        heading: "About these terms",
        paragraphs: [
          "These Terms and Conditions govern your use of the OVERSTOCK website and purchases made through it. By accessing the website or placing an order, you agree to these terms. OVERSTOCK is operated by an Australian-based business and sells to customers in the United States and other destinations offered at checkout.",
          "If you do not agree to these terms, please do not use the website or place an order. These terms apply together with the policies linked on our website, including our Privacy, Shipping, and Refund pages.",
        ],
      },
      {
        heading: "Using the website",
        paragraphs: [
          "You agree to use the website only for lawful purposes and to provide accurate, current contact, payment, and delivery details. You must not interfere with the website, attempt unauthorised access, introduce malicious code, or use the website to mislead, defraud, or harm others.",
          "We may restrict or suspend access where reasonably necessary to protect the website, customers, or our business, or to comply with law.",
        ],
      },
      {
        heading: "Products and availability",
        paragraphs: [
          "We make reasonable efforts to describe and photograph products accurately. Please review the listing details before ordering. Colours and appearance may vary between screens. Many products are limited or one of one, so availability can change and an item in your cart is not guaranteed until your order is accepted.",
          "If a product is unavailable or a listing contains a material error, we may contact you to correct the information or cancel the affected order. If we cancel an order after payment, we will refund the amount paid for that order to the original payment method, subject to any different remedy required by law.",
        ],
      },
      {
        heading: "Orders, prices, and payment",
        paragraphs: [
          "Submitting an order is an offer to purchase the products in your cart. An order is accepted when payment is completed and we send an order confirmation. We may decline or cancel an order where permitted by law, including where an item is unavailable, payment is not authorised, or a material pricing or listing error has occurred.",
          "Prices may be displayed in U.S. dollars (USD). The Square hosted checkout displays the amount charged in Australian dollars (AUD). Please review the final amount before authorising payment. Your bank or card issuer may apply its own exchange rate or foreign transaction fee.",
          "Payments are processed through Square. Payment details entered through Square's hosted checkout are handled under Square's terms and privacy information. Any shipping charges and taxes applicable to your order will be shown during checkout where required.",
        ],
      },
      {
        heading: "Shipping and delivery",
        paragraphs: [
          "We will ship orders to the address provided at checkout. You are responsible for checking that the address is complete and accurate. Delivery timeframes are estimates unless a specific date is expressly stated as guaranteed.",
          "We will ship within the timeframe stated when you place your order or, if no timeframe is stated, within the period required by applicable law. For U.S. orders, the Federal Trade Commission's Mail, Internet, or Telephone Order Merchandise Rule generally requires shipment within the promised timeframe or within 30 days if no timeframe was given. If we cannot meet the applicable timeframe, we will provide the notice and the option to agree to a delay or cancel for a prompt full refund as required by the Rule.",
          "Carrier delays may affect delivery estimates. Nothing in these terms limits any rights or remedies you may have under applicable consumer law.",
        ],
      },
      {
        heading: "Cancellations and change-of-mind returns",
        paragraphs: [
          "All sales are final for change of mind. You may email us to request cancellation before your order ships. If we confirm that the order can be cancelled before dispatch, we will cancel it and refund the amount paid to the original payment method.",
          "Once an order has shipped, we do not accept cancellations, returns, or exchanges for change of mind. This policy reflects the limited and often one-of-one nature of our products. It does not exclude, restrict, or replace any right to a remedy that cannot lawfully be excluded.",
        ],
      },
      {
        heading: "Incorrect, damaged, or faulty items",
        paragraphs: [
          "If your order is incorrect or an item arrives damaged or faulty, contact us by email using the details on our Contact page. Please include your order number, a brief description of the issue, and clear photos where relevant. We will review the issue and work with you to resolve it promptly.",
          "Where permitted by law, we may offer a voucher as a resolution for a damaged item. A voucher will be used only where it is a lawful remedy or you agree to accept it. It will not replace a repair, replacement, refund, or other remedy required by applicable law. Because many items are one of one, an identical replacement may not be available; this does not affect your legal rights.",
        ],
      },
      {
        heading: "Consumer rights and applicable laws",
        paragraphs: [
          "For Australian consumers, the Australian Consumer Law (Schedule 2 to the Competition and Consumer Act 2010 (Cth)) provides consumer guarantees that cannot be excluded. Depending on the problem, your rights may include a free repair or, for a major failure, your choice of a refund or replacement, as well as compensation for reasonably foreseeable loss.",
          "For U.S. consumers, applicable federal and state consumer protection laws apply to your purchase. The shipping-delay rights described above are not affected by our change-of-mind policy.",
          "Nothing in these terms is intended to exclude, restrict, or modify a consumer guarantee, statutory right, or remedy that cannot lawfully be excluded, restricted, or modified. If a term conflicts with a mandatory legal right, that legal right applies to the extent of the conflict.",
        ],
      },
      {
        heading: "Website content and third-party services",
        paragraphs: [
          "The website's design, text, graphics, and other materials are owned by or licensed to OVERSTOCK and are protected by applicable intellectual property laws. You may use the website for personal, non-commercial browsing and purchasing. You must not copy or commercially use website content without permission, except where the law allows.",
          "The website may link to or use third-party services, including Square and delivery carriers. Those services may have their own terms and privacy notices. This does not limit OVERSTOCK's responsibilities to you under these terms or applicable law.",
        ],
      },
      {
        heading: "Liability",
        paragraphs: [
          "To the extent permitted by law, OVERSTOCK is not responsible for losses arising from your unlawful use of the website or from events outside our reasonable control. Nothing in these terms excludes or limits liability, consumer guarantees, or remedies that cannot lawfully be excluded or limited.",
        ],
      },
      {
        heading: "Changes and general terms",
        paragraphs: [
          "We may update these terms from time to time. The terms in effect when you place an order apply to that order, subject to any rights that apply by law. If a provision is found unenforceable, it will be read down or severed to the extent necessary, and the remaining provisions will continue to apply.",
          "These terms operate subject to the mandatory consumer protection laws that apply to your purchase. They do not take away any rights you have under those laws.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [
          "For questions about these terms or an order, contact us by email using the address on our Contact page. Include your order number when relevant. Do not send passwords or full payment-card details.",
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
