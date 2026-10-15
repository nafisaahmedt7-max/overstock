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
        heading: "1. Business identity and contact",
        paragraphs: [
          "These terms are between you and [ENTER THE FULL REGISTERED LEGAL NAME OF THE BUSINESS], trading as OVERSTOCK. The business is a [ENTER BUSINESS STRUCTURE, FOR EXAMPLE SOLE TRADER OR AUSTRALIAN PROPRIETARY COMPANY], ABN [ENTER THE 11-DIGIT ABN] and, if applicable, ACN [ENTER THE 9-DIGIT ACN]. Its registered or principal business address is 24 Eolian Loop, Clayton, Sydney, [ENTER STATE OR TERRITORY AND POSTCODE], Australia. In these terms, “OVERSTOCK”, “we”, “us” and “our” mean that business.",
          "For questions, complaints, or notices about an order or these terms, contact operations.overstock@gmail.com. Include your order number where relevant. Do not email passwords or full payment-card details."
        ],
      },
      {
        heading: "2. Scope and acceptance",
        paragraphs: [
          "These terms apply to your access to and use of the OVERSTOCK website and to purchases made through it. The relevant product listing, checkout information, order confirmation, and any policy expressly incorporated into the checkout also form part of the agreement for that purchase. If terms conflict, the purchase-specific information applies to that order, subject to mandatory law.",
          "By using the website or placing an order, you agree to these terms. Please read them and the product listing before purchasing. Your order is an offer to buy. We accept it when payment is authorised and we send confirmation that the order has been accepted. An automated acknowledgement that only confirms receipt is not acceptance."
        ],
      },
      {
        heading: "3. Eligibility and account security",
        paragraphs: [
          "You must be legally capable of entering a binding contract where you live to place an order. If you are under the age of majority where you live, a parent or legal guardian must place the order or consent to your use of the website and purchase.",
          "You must provide accurate, current information and keep any account credentials confidential. You are responsible for activity carried out through your account, except to the extent loss is caused by our acts or omissions or applicable law provides otherwise. Contact us promptly if you believe your account or order information has been used without permission."
        ],
      },
      {
        heading: "4. Products, condition, and availability",
        paragraphs: [
          "We aim to ensure each listing accurately describes the item, its condition, material features, measurements, and any known fault or wear. A condition or fault clearly disclosed before purchase is part of the description, but disclosure does not exclude any non-waivable consumer right. Product photographs are illustrative of the listed item; colours may appear differently on different screens.",
          "Some items are limited or one of one. An item in a cart is not reserved or an accepted order. Availability is confirmed when we accept the order. If an item is unavailable or a material listing error is identified, we will contact you to correct the information or cancel the affected order. If we cancel a paid order, we will return the amount paid for that order to the original payment method, unless the law requires another remedy.",
          "Brand names, product names, logos, and trade marks are used only to identify items. Their appearance does not imply that a brand or rights holder sponsors, approves, or is affiliated with OVERSTOCK unless we expressly state that it does."
        ],
      },
      {
        heading: "5. Prices, currency, and payment",
        paragraphs: [
          "The website may display prices in U.S. dollars (USD). Square's hosted checkout shows the amount charged in Australian dollars (AUD). Review and authorise the amount shown at checkout. Your bank or card issuer may apply its own exchange rate or transaction fees.",
          "Payments are processed through Square. Information entered into Square's hosted checkout is handled under Square's applicable terms and privacy information. You must be authorised to use the payment method submitted.",
          "If a material pricing or listing error is identified before dispatch, we may contact you to confirm the corrected details or cancel the affected order. If we cancel a paid order, we will refund the amount paid to the original payment method, subject to any remedy required by law."
        ],
      },
      {
        heading: "6. Dispatch and delivery",
        paragraphs: [
          "Our typical dispatch timeframe is 3–4 weeks after we accept your order. Dispatch means handing the parcel to the delivery carrier; it is not the delivery date. Transit time follows dispatch and varies by destination and carrier.",
          "You are responsible for entering a complete and accurate delivery address. Contact us promptly if it needs correcting. We cannot guarantee an address change after dispatch processing has begun.",
          "We will make a reasonable basis assessment of the dispatch timeframe represented when you order. For qualifying U.S. orders, the Federal Trade Commission's Mail, Internet, or Telephone Order Merchandise Rule, 16 C.F.R. Part 435, requires a seller to ship within the represented timeframe or, if none is stated, generally within 30 days. If we cannot meet the applicable timeframe, we will provide the delay notice, revised timeframe, and cancellation and refund option required by that Rule.",
          "If an order is delayed, lost, or damaged in transit, contact us at operations.overstock@gmail.com. We will respond in accordance with applicable law. Nothing in these terms limits rights relating to delivery that cannot lawfully be limited."
        ],
      },
      {
        heading: "7. Change-of-mind cancellations and final sale",
        paragraphs: [
          "All sales are final for change of mind. We do not offer change-of-mind returns or exchanges after an order has been dispatched.",
          "Before dispatch, you may email operations.overstock@gmail.com to request cancellation. A cancellation is effective when we confirm it. If we confirm cancellation before dispatch, we will refund the amount paid to the original payment method.",
          "This policy does not exclude a cancellation, refund, replacement, repair, or other remedy required by law. In particular, it does not remove any rights that apply if we cannot dispatch within a legally required timeframe or do not provide a legally required delay notice and cancellation option."
        ],
      },
      {
        heading: "8. Incorrect, damaged, or faulty goods",
        paragraphs: [
          "If your order is incorrect, an item arrives damaged, or an item has a fault not disclosed before purchase, email operations.overstock@gmail.com promptly with your order number, a description of the issue, and photographs where relevant. We may ask reasonable questions or request to inspect the item.",
          "For confirmed transit damage, OVERSTOCK will offer a voucher where permitted by law. You do not have to accept a voucher where the law gives you another remedy or choice. A voucher does not replace any repair, replacement, refund, cancellation, or compensation required by law. A replacement may not be available for a one-of-one item; that does not reduce your legal rights.",
          "This section does not limit remedies for goods that fail a consumer guarantee. A remedy may be unavailable for damage caused after delivery by misuse or accident, or for a condition accurately disclosed before purchase, only to the extent permitted by law."
        ],
      },
      {
        heading: "9. Consumer protection laws",
        paragraphs: [
          "Australian customers may have rights under the Australian Consumer Law in Schedule 2 to the Competition and Consumer Act 2010 (Cth), including consumer guarantees that cannot be excluded. Depending on the circumstances, available remedies may include repair, replacement, refund, cancellation, or compensation. For a major failure of goods, the Australian Consumer Law gives the consumer a choice of refund or replacement.",
          "Australian law also regulates misleading or deceptive conduct and unfair terms in standard-form consumer contracts. Nothing in these terms is intended to mislead you about a consumer right or to exclude a term or remedy where the law does not permit that exclusion.",
          "For U.S. customers, applicable federal, state, and local consumer-protection laws continue to apply. These may include Section 5 of the Federal Trade Commission Act, 15 U.S.C. § 45, and state laws prohibiting unfair or deceptive acts or practices. The FTC's online merchandise shipping rule is described in section 6.",
          "If a provision of these terms is inconsistent with a mandatory consumer law that applies to you, that law prevails to the extent of the inconsistency. No exclusion or limitation applies to a right, guarantee, remedy, or liability that cannot legally be excluded or limited."
        ],
      },
      {
        heading: "10. Website access and acceptable use",
        paragraphs: [
          "We grant you a limited, personal, non-exclusive, non-transferable, revocable permission to access and use the website for lawful browsing and purchasing. You must not use the website to commit fraud, violate another person's rights, obtain unauthorised access, interfere with its operation or security, introduce malicious code, or collect information through unauthorised scraping or automated means.",
          "We may suspend or restrict access where reasonably necessary to protect the website, customers, or our legal rights, or to comply with law. This does not affect rights or remedies that cannot lawfully be restricted."
        ],
      },
      {
        heading: "11. Copyright, trade marks, and infringement notices",
        paragraphs: [
          "Unless otherwise stated, original website text, layout, graphics, and OVERSTOCK-created photographs are owned by or licensed to OVERSTOCK and protected by applicable intellectual-property laws, including the Copyright Act 1968 (Cth) and U.S. copyright law in Title 17 of the United States Code. You may view and use this material for personal, non-commercial purposes connected with using the website. You must not reproduce, adapt, publish, distribute, or commercially exploit it without permission, except as permitted by law.",
          "Third-party product names, logos, photographs, and trade marks remain the property of their respective owners. Their use to identify a product does not transfer ownership or imply endorsement.",
          "If you believe material on the website infringes your copyright, email operations.overstock@gmail.com with the page address, identification of the protected work, the material you believe is infringing, your contact details, and a statement explaining your ownership or authority. A notice requesting action under the U.S. Digital Millennium Copyright Act (17 U.S.C. § 512) must meet that law's requirements and be sent to a designated agent where one has been registered. If OVERSTOCK has registered a designated agent, their details are: [ENTER THE REGISTERED DMCA AGENT'S NAME, POSTAL ADDRESS, PHONE NUMBER, AND EMAIL; OTHERWISE REMOVE THIS SENTENCE]."
        ],
      },
      {
        heading: "12. Electronic transactions and communications",
        paragraphs: [
          "You agree that order records, confirmations, and service notices may be provided electronically to the email address you give us. Please keep copies of your order confirmation and these terms. Any consent or disclosure required by law must still be obtained or given.",
          "Electronic transactions are recognised under the Australian Electronic Transactions Act 1999 (Cth) and, where applicable, the U.S. Electronic Signatures in Global and National Commerce Act (15 U.S.C. §§ 7001–7031) and applicable state electronic-transactions laws. This clause does not make an electronic record effective where a legal requirement for consent, notice, or delivery has not been met."
        ],
      },
      {
        heading: "13. Privacy and marketing communications",
        paragraphs: [
          "Our Privacy Policy explains how we handle personal information. The Privacy Act 1988 (Cth) and Australian Privacy Principles apply to the extent the business is covered by them. U.S. state privacy laws, including the California Consumer Privacy Act as amended by the California Privacy Rights Act, apply only where their scope and thresholds are met. Nothing in these terms removes rights available under an applicable privacy law.",
          "We may send messages needed to confirm, fulfil, or support an order. Marketing messages will be sent only as permitted by applicable law. Where required, commercial electronic messages must meet consent, sender-identification, and unsubscribe requirements under laws such as the Australian Spam Act 2003 (Cth) and the U.S. CAN-SPAM Act, 15 U.S.C. §§ 7701–7713."
        ],
      },
      {
        heading: "14. Third-party services",
        paragraphs: [
          "Square provides hosted checkout and payment processing. Delivery carriers provide transport services. The website may link to third-party websites or social media services. Those providers operate under their own terms and privacy notices. A third party's involvement does not remove OVERSTOCK's obligations to you under these terms or applicable law."
        ],
      },
      {
        heading: "15. Liability",
        paragraphs: [
          "Nothing in these terms excludes or limits a consumer guarantee, right, remedy, or liability that cannot lawfully be excluded or limited. Subject to that rule and to the maximum extent permitted by law, OVERSTOCK is not responsible for loss caused by your unlawful use of the website or an event outside our reasonable control. This clause does not exclude liability for our own conduct where the law does not allow that exclusion."
        ],
      },
      {
        heading: "16. Governing law and dispute resolution",
        paragraphs: [
          "These terms are governed by the laws of [ENTER THE AUSTRALIAN STATE OR TERRITORY IN WHICH THE BUSINESS OPERATES], Australia. Courts in that jurisdiction may hear disputes, subject to any right you have to bring a claim in another forum under mandatory consumer law. This clause does not deprive you of protections that apply where you live.",
          "If you have a concern, email operations.overstock@gmail.com and we will try to resolve it directly. Contacting us first is not a condition of exercising a legal right, making a complaint to a regulator, or starting a proceeding."
        ],
      },
      {
        heading: "17. Changes and general terms",
        paragraphs: [
          "We may update these terms by publishing a revised version on the website. The version in effect when we accept your order applies to that purchase, subject to mandatory law. We will not use a later revision to remove a right you already have.",
          "If a court or tribunal finds a provision invalid or unenforceable, it is to be read down or severed only to the extent necessary. The remaining provisions continue to apply. A failure or delay in enforcing a term is not a waiver of that term. These terms, together with the purchase-specific information and policies incorporated into the order, form the agreement for your purchase."
        ],
      },
    ],
  },
  privacy: {
    title: "PRIVACY POLICY",
    updated: "Last updated October 15, 2026",
    sections: [
      {
        heading: "1. Who we are",
        paragraphs: [
          "This policy explains how [ENTER THE FULL REGISTERED LEGAL NAME OF THE BUSINESS], trading as OVERSTOCK, handles personal information through this website and in connection with customer orders. The business address is 24 Eolian Loop, Clayton, Sydney, [ENTER STATE OR TERRITORY AND POSTCODE], Australia. Contact: operations.overstock@gmail.com.",
          "The Privacy Act 1988 (Cth) and Australian Privacy Principles apply to the extent the business is covered by them. U.S. state privacy laws apply where their scope and thresholds are met. This policy does not limit privacy rights that apply to you."
        ],
      },
      {
        heading: "2. Information we collect",
        paragraphs: [
          "Depending on how you use the website, we may collect contact and delivery details, order and transaction records, messages you send to customer support, and technical information such as device, browser, log, and website-use data. [CONFIRM THE CATEGORIES ACTUALLY COLLECTED AND REMOVE ANY THAT DO NOT APPLY; ADD ANY OTHER CATEGORIES].",
          "Payment-card details entered in Square's hosted checkout are handled by Square. We receive information about the order and payment status needed to manage the transaction, but do not intentionally collect full payment-card details through this website."
        ],
      },
      {
        heading: "3. How we use information",
        paragraphs: [
          "We use personal information to process and administer orders, communicate with customers, arrange delivery, respond to questions and complaints, maintain business and transaction records, protect the website and prevent fraud, and meet legal obligations.",
          "[ADD ANY OTHER PURPOSES, INCLUDING ANALYTICS, PERSONALISATION, OR MARKETING, IF USED. DO NOT INCLUDE PURPOSES THAT ARE NOT ACTUALLY USED]."
        ],
      },
      {
        heading: "4. When information is shared",
        paragraphs: [
          "We may disclose the information reasonably needed for an order to Square for payment processing, delivery carriers for fulfilment, and service providers that host, secure, or support the website. We may also disclose information where required or authorised by law, to protect legal rights, or as part of a business transfer permitted by law.",
          "[LIST THE ACTUAL WEBSITE HOSTING, ANALYTICS, EMAIL, CUSTOMER-SUPPORT, AND OTHER SERVICE PROVIDERS THAT RECEIVE PERSONAL INFORMATION, AND REMOVE SERVICES NOT USED]. We do not state that personal information is sold or shared for targeted advertising unless that practice is confirmed and this policy is updated to describe it."
        ],
      },
      {
        heading: "5. Overseas handling",
        paragraphs: [
          "OVERSTOCK is based in Australia and sells to customers in the United States. Information may be stored or processed in Australia, the United States, or other countries where our service providers operate. [CONFIRM THE COUNTRIES IN WHICH THE BUSINESS AND ITS PROVIDERS STORE OR ACCESS PERSONAL INFORMATION]. Where required by law, we take steps to protect information disclosed to overseas recipients."
        ],
      },
      {
        heading: "6. Cookies and similar technology",
        paragraphs: [
          "[CONFIRM WHETHER THE WEBSITE USES COOKIES, PIXELS, ANALYTICS, OR ADVERTISING TECHNOLOGY. IF USED, IDENTIFY EACH TOOL, WHAT IT COLLECTS, ITS PURPOSE, AND HOW A VISITOR CAN MANAGE OPTIONAL TRACKING]. Your browser may allow you to block or delete cookies, although some website functions may not work as intended."
        ],
      },
      {
        heading: "7. Retention and security",
        paragraphs: [
          "We retain personal information for as long as reasonably needed for the purposes described in this policy, including order administration, recordkeeping, dispute resolution, and legal compliance. [INSERT THE ACTUAL RETENTION PERIODS OR CRITERIA FOR ORDER, SUPPORT, AND TECHNICAL RECORDS].",
          "We use reasonable safeguards designed to protect information against loss, misuse, unauthorised access, modification, or disclosure. No online system can be guaranteed completely secure."
        ],
      },
      {
        heading: "8. Your choices and privacy rights",
        paragraphs: [
          "You may contact us to request access to or correction of personal information we hold about you. We may need to verify your identity and may be permitted or required by law to refuse or limit a request. Where an applicable U.S. state privacy law provides additional rights, such as deletion, portability, or opting out of certain processing, you may exercise those rights using the contact details below.",
          "You may unsubscribe from marketing emails using the unsubscribe option in the message. We may continue to send non-marketing messages needed to manage an order or respond to you."
        ],
      },
      {
        heading: "9. Children",
        paragraphs: [
          "The website is not directed to children under 13, and we do not knowingly request personal information from children under 13. If you believe a child has provided personal information, contact us so we can assess and address the request in accordance with applicable law. [CONFIRM THE INTENDED AGE RANGE AND ACTUAL CHILD-DATA PRACTICES BEFORE PUBLICATION]."
        ],
      },
      {
        heading: "10. Complaints and contact",
        paragraphs: [
          "For a privacy question, access or correction request, or complaint, email operations.overstock@gmail.com. Tell us what happened and what outcome you are seeking. We will review and respond within a reasonable period and within any timeframe required by law.",
          "If the Australian Privacy Act applies and you are not satisfied with our response, you may be able to complain to the Office of the Australian Information Commissioner. U.S. residents may also contact the privacy regulator or attorney general in their state where available."
        ],
      },
      {
        heading: "11. Updates",
        paragraphs: [
          "We may update this policy to reflect changes in our information practices or legal obligations. The current version will be posted on this page with its update date. Material changes will be communicated where required by law."
        ],
      },
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
