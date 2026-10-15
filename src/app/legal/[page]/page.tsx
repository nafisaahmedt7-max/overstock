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
        heading: "1. Business details and contract",
        paragraphs: [
          "OVERSTOCK is a trading name of [ENTER THE FULL REGISTERED LEGAL NAME OF THE BUSINESS], ABN [ENTER THE 11-DIGIT ABN] / ACN [ENTER THE 9-DIGIT ACN IF THE BUSINESS IS AN AUSTRALIAN COMPANY]. The business address is 24 Eolian Loop, Clayton, Sydney, [ENTER STATE OR TERRITORY AND POSTCODE], Australia. In these terms, “OVERSTOCK”, “we”, “us”, and “our” refer to that business.",
          "These Terms and Conditions govern use of the OVERSTOCK website and purchases made through it. The product listing, checkout details, order confirmation, and policies linked on the website form part of the purchase terms. If a purchase-specific term conflicts with these general terms, the purchase-specific term applies to that order, subject always to mandatory consumer law.",
          "Before ordering, please read the product listing and these terms. Submitting an order is your offer to purchase. We accept it when payment is authorised and we send an order confirmation. An automated order confirmation acknowledging receipt does not by itself confirm acceptance unless it says the order is accepted.",
        ],
      },
      {
        heading: "2. Products and listings",
        paragraphs: [
          "We aim to describe each item accurately, including its condition, material features, measurements, and any known fault or wear. A fault or condition clearly disclosed before purchase is part of the listing. Please review all listing details before ordering. Colours may appear differently on different screens.",
          "Many items are limited or one of one. Product availability can change. An item in your cart is not an accepted order. If an item is unavailable or a material listing error is found, we will contact you to correct the issue or cancel the affected order. If a paid order is cancelled by us, we will refund the amount paid for that order unless a different remedy is required by law.",
          "Descriptions and photographs are provided to identify and describe the listed item. They do not imply that OVERSTOCK is affiliated with or endorsed by a brand or rights holder unless we expressly say so.",
        ],
      },
      {
        heading: "3. Prices, currency, and payment",
        paragraphs: [
          "The website may display prices in U.S. dollars (USD). The Square hosted checkout displays the amount charged in Australian dollars (AUD). Review the final amount shown by Square before authorising payment. Your bank or card issuer may apply its own exchange rate or transaction fees.",
          "Payments are processed through Square. Payment information entered through Square's hosted checkout is handled under Square's applicable terms and privacy information. You must be authorised to use the payment method submitted.",
          "If a material pricing or listing error is discovered before dispatch, we may contact you to confirm the correct details or cancel the affected order. If we cancel a paid order, we will refund the amount paid to the original payment method, subject to any remedy required by law.",
        ],
      },
      {
        heading: "4. Dispatch and delivery",
        paragraphs: [
          "Our current dispatch timeframe is typically 3–4 weeks after we accept your order. Dispatch means handing the parcel to the delivery carrier; it is not the delivery date. Carrier transit time follows dispatch and varies by destination and carrier.",
          "You must provide a complete and accurate delivery address. Contact us promptly if you need to correct it. We cannot guarantee that an address change can be made after dispatch processing has begun.",
          "If we cannot dispatch by the timeframe stated for your order, we will give you the revised information and the options required by law. For U.S. orders, the Federal Trade Commission's Mail, Internet, or Telephone Order Merchandise Rule (16 C.F.R. Part 435) generally requires shipment within the stated time or within 30 days if no time was stated. Where a delay occurs, the Rule requires a notice offering the customer the option to agree to the delay or cancel for a prompt refund.",
          "We remain responsible for responding to an order that is lost, delayed, or damaged in transit in accordance with applicable consumer law. Nothing in these terms limits your rights relating to delivery.",
        ],
      },
      {
        heading: "5. Final sale, cancellations, and refunds",
        paragraphs: [
          "All sales are final for change of mind. Because many OVERSTOCK items are low-cost, limited, or one of one, we do not offer change-of-mind returns or exchanges after dispatch.",
          "You may email operations.overstock@gmail.com to request cancellation before dispatch. Cancellation takes effect when we confirm it. If we confirm cancellation before dispatch, we will refund the amount paid to the original payment method.",
          "The change-of-mind policy does not prevent cancellation or a refund where required by law, including where we cannot dispatch within the time required by law or fail to provide a required delay notice and option.",
        ],
      },
      {
        heading: "6. Incorrect, damaged, or faulty items",
        paragraphs: [
          "If an item is incorrect, arrives damaged, or has a fault that was not disclosed in its listing, email operations.overstock@gmail.com promptly. Include your order number, a brief description, and photographs where relevant. We may ask reasonable questions or inspect the item to assess the issue.",
          "For confirmed damage, we will offer a voucher as a resolution where permitted by law. You are not required to accept a voucher where applicable law gives you a different remedy or choice. A voucher does not replace a repair, replacement, refund, cancellation, or other remedy required by law. An identical replacement may not be available for a one-of-one item; this does not reduce your legal rights.",
          "A remedy may not be available for damage caused after delivery by misuse or accident, or for a condition clearly disclosed before purchase, subject to any rights that cannot lawfully be excluded.",
        ],
      },
      {
        heading: "7. Consumer protection and online sales laws",
        paragraphs: [
          "For Australian consumers, the Australian Consumer Law in Schedule 2 to the Competition and Consumer Act 2010 (Cth) provides consumer guarantees that cannot be excluded. Depending on the issue, remedies may include repair, replacement, refund, cancellation, or compensation. For a major failure of goods, a consumer may choose a refund or replacement.",
          "Australian law also prohibits misleading or deceptive conduct and regulates unfair terms in standard-form consumer contracts. These terms are to be read consistently with those protections and do not authorise misleading product descriptions or unfair reliance on a term.",
          "For U.S. consumers, applicable federal and state consumer-protection laws continue to apply. Section 5 of the U.S. Federal Trade Commission Act (15 U.S.C. § 45) prohibits unfair or deceptive acts or practices in or affecting commerce. The FTC shipping rule described above applies to qualifying online merchandise orders.",
          "Nothing in these terms excludes, restricts, or modifies a consumer guarantee, right, remedy, or liability that cannot lawfully be excluded, restricted, or modified. If a term conflicts with mandatory consumer law, the law prevails to the extent of that conflict.",
        ],
      },
      {
        heading: "8. Electronic orders and communications",
        paragraphs: [
          "You agree that orders, confirmations, and service notices may be created and sent electronically to the email address you provide. Keep your order confirmation and these terms for your records. This clause does not replace any consent or disclosure required by law.",
          "Electronic transactions are recognised under the Australian Electronic Transactions Act 1999 (Cth) and, where applicable, the U.S. Electronic Signatures in Global and National Commerce Act (15 U.S.C. §§ 7001–7031) and state electronic-transactions laws. Any electronic agreement remains subject to the legal requirements that apply to it.",
          "We may send emails needed to confirm, process, or support an order. If you separately subscribe to marketing messages, you may unsubscribe using the link in the message. Marketing messages will be sent in accordance with applicable laws, including the Australian Spam Act 2003 and the U.S. CAN-SPAM Act where they apply.",
        ],
      },
      {
        heading: "9. Website use, copyright, and trade marks",
        paragraphs: [
          "You may use the website for lawful personal browsing and purchasing. You must not attempt unauthorised access, disrupt the website, introduce malicious code, scrape it in a way that harms its operation, misuse another person's information, or use the website for fraud or another unlawful purpose.",
          "Original OVERSTOCK website text, design, and photographs are protected by applicable copyright laws, including the Copyright Act 1968 (Cth) and, where applicable, U.S. copyright law in Title 17 of the United States Code. You may not copy, publish, adapt, or commercially use that material without permission, except where the law allows.",
          "Product names, logos, and trade marks shown to identify items belong to their respective rights holders. Their display does not mean that a rights holder sponsors, approves, or is affiliated with OVERSTOCK.",
          "To report a copyright concern, email operations.overstock@gmail.com with the webpage address, identification of the work, and an explanation of your rights or authority. A notice seeking action under the U.S. Digital Millennium Copyright Act must satisfy 17 U.S.C. § 512(c)(3) and be sent to our designated agent: [IF YOU DESIGNATE AND REGISTER A DMCA AGENT, ENTER THE AGENT'S NAME, POSTAL ADDRESS, PHONE NUMBER, AND EMAIL HERE].",
        ],
      },
      {
        heading: "10. Privacy and third-party services",
        paragraphs: [
          "Our Privacy page describes how we handle personal information. Where applicable, that handling is subject to the Privacy Act 1988 (Cth), the Australian Privacy Principles, and privacy laws that apply in relevant U.S. states. The Privacy page must be read consistently with any privacy rights that apply to you.",
          "Square provides hosted checkout and payment processing. Delivery may be performed by carriers. Those providers may have separate terms and privacy notices. Their involvement does not remove OVERSTOCK's obligations to you under these terms or applicable law.",
        ],
      },
      {
        heading: "11. Liability",
        paragraphs: [
          "Nothing in these terms excludes or limits a right, guarantee, remedy, or liability that cannot lawfully be excluded or limited. Subject to that protection and to the maximum extent permitted by law, we are not liable for loss caused by your unlawful use of the website or an event outside our reasonable control.",
        ],
      },
      {
        heading: "12. Governing law and disputes",
        paragraphs: [
          "These terms are governed by the laws of [ENTER THE AUSTRALIAN STATE OR TERRITORY WHERE THE BUSINESS IS REGISTERED], subject to any mandatory consumer-protection laws that apply where you live. This clause does not prevent you from bringing a claim in a forum available to you by law. You may email us first so we can try to resolve a concern, but contacting us is not a condition of exercising a legal right or contacting a regulator.",
        ],
      },
      {
        heading: "13. Changes and severability",
        paragraphs: [
          "We may revise these terms by publishing an updated version on the website. The version in effect when an order is accepted applies to that order, subject to mandatory legal rights. If a court or tribunal finds a term unenforceable, it will be read down or severed to the minimum extent necessary. The remaining terms continue to apply.",
        ],
      },
      {
        heading: "14. Contact",
        paragraphs: [
          "Email operations.overstock@gmail.com about an order or these terms. Our business address is 24 Eolian Loop, Clayton, Sydney, [ENTER STATE OR TERRITORY AND POSTCODE], Australia. Include your order number when relevant and do not send passwords or full payment-card details.",
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
      "All sales are final for change of mind. You may email operations.overstock@gmail.com to request cancellation before dispatch. Cancellation takes effect when we confirm it. If we confirm the order can be cancelled before dispatch, we will refund the amount paid to the original payment method.",
      "After dispatch, we do not accept change-of-mind cancellations, returns, or exchanges. This does not restrict a cancellation, refund, replacement, repair, or other remedy required by law, including a remedy for an order that cannot be dispatched within the period required by law.",
      "If an item is incorrect, arrives damaged, or has a fault that was not disclosed before purchase, email us promptly at operations.overstock@gmail.com. Include your order number, a brief description, and photos where relevant. For confirmed damage, we will offer a voucher where permitted by law. You are not required to accept a voucher if applicable law gives you a different remedy or choice.",
      "Australian Consumer Law guarantees cannot be excluded. U.S. customers retain rights under applicable federal and state consumer-protection laws. Nothing in this policy limits rights or remedies that applicable law does not allow us to exclude.",
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
