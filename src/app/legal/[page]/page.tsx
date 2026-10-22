import { notFound } from "next/navigation";
import type { ReactNode } from "react";

type LegalSection = { heading: string; paragraphs: string[] };
const brandTerms = ["OVERSTOCK", "operations.overstock@gmail.com"];
const legalTerms = [
  "Competition and Consumer Act 2010 (Cth)",
  "Australian Consumer Law",
  "Australian Privacy Principles",
  "Privacy Act 1988 (Cth)",
  "Federal Trade Commission's Mail, Internet, or Telephone Order Merchandise Rule",
  "Federal Trade Commission Mail, Internet, or Telephone Order Merchandise Rule",
  "FTC Mail, Internet, or Telephone Order Merchandise Rule",
  "Mail, Internet, or Telephone Order Merchandise Rule",
  "16 C.F.R. Part 435",
  "16 C.F.R.",
  "Federal Trade Commission Act",
  "Section 5 of the Federal Trade Commission Act",
  "Federal Trade Commission",
  "FTC",
  "Office of the Australian Information Commissioner",
  "Australian Competition and Consumer Commission",
  "15 U.S.C. §§ 7001–7031",
  "15 U.S.C. §§ 7701–7713",
  "15 U.S.C. § 45",
  "15 U.S.C.",
  "Copyright Act 1968 (Cth)",
  "Digital Millennium Copyright Act",
  "17 U.S.C. § 512",
  "17 U.S.C.",
  "Title 17 of the United States Code",
  "Electronic Transactions Act 1999 (Cth)",
  "Electronic Signatures in Global and National Commerce Act",
  "Australian Spam Act 2003 (Cth)",
  "U.S. CAN-SPAM Act",
  "California Consumer Privacy Act",
  "California Privacy Rights Act",
];
const emphasizedTerms = [...brandTerms, ...legalTerms].sort((a, b) => b.length - a.length);

function renderPlain(text: string, keyBase: string, boldUnmatched = false) {
  const nodes: ReactNode[] = [];
  let rest = text;
  let index = 0;
  const appendPlain = (value: string) => {
    if (!value) return;
    if (boldUnmatched) nodes.push(<strong key={`${keyBase}-plain-${index++}`}>{value}</strong>);
    else nodes.push(value);
  };

  while (rest.length > 0) {
    let nextTerm = "";
    let nextPosition = rest.length;
    for (const term of emphasizedTerms) {
      const position = rest.indexOf(term);
      if (position >= 0 && position < nextPosition) {
        nextPosition = position;
        nextTerm = term;
      }
    }
    if (!nextTerm) {
      appendPlain(rest);
      break;
    }
    appendPlain(rest.slice(0, nextPosition));
    const key = `${keyBase}-term-${index++}`;
    nodes.push(
      brandTerms.includes(nextTerm) ? (
        <strong key={key}>{nextTerm}</strong>
      ) : (
        <strong className="legal-law-highlight" key={key}>{nextTerm}</strong>
      )
    );
    rest = rest.slice(nextPosition + nextTerm.length);
  }
  return nodes;
}

function renderFormatted(text: string) {
  return text.split("**").flatMap((part, index) =>
    renderPlain(part, `formatted-${index}`, index % 2 === 1)
  );
}

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

function ContactIcon({ label }: { label: string }) {
  const common = {
    "aria-hidden": true as const,
    viewBox: "0 0 24 24",
    className: "contact-option-icon",
  };

  if (label === "FACEBOOK") {
    return <svg {...common}><circle cx="12" cy="12" r="11" fill="currentColor" /><path d="M13.4 20v-7h2.3l.35-2.7H13.4V8.6c0-.78.22-1.3 1.35-1.3h1.45V4.9c-.25-.03-1.1-.1-2.1-.1-2.08 0-3.5 1.27-3.5 3.62v1.88H8.25V13h2.35v7h2.8Z" fill="var(--paper)" /></svg>;
  }

  if (label === "INSTAGRAM") {
    return <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.7" r=".8" fill="currentColor" stroke="none" /></svg>;
  }

  if (label === "ADDRESS") {
    return <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.4" strokeWidth="2.4" /></svg>;
  }

  return <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="m4 7 8 6 8-6" /></svg>;
}

const pages: Record<string, LegalContent> = {
  terms: {
    title: "TERMS AND CONDITIONS",
    updated: "LAST UPDATED OCTOBER 15, 2026",
    sections: [
      {
        heading: "1. Business identity and contact",
        paragraphs: [
          `These terms are between you and **“OVERSTOCK”**, the business operating this website. **“OVERSTOCK”** operates from **24 Eolian Loop, Clayton, Sydney, Australia**. In these terms, “OVERSTOCK”, “we”, “us” and “our” refer to OVERSTOCK.`,
          "For questions, complaints, or notices about an order or these terms, contact operations.overstock@gmail.com. Include your order number where relevant."
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
          "The website may display prices in **U.S. dollars (USD)**. Square's hosted checkout shows the amount charged in **Australian dollars (AUD)**. Review and authorise the amount shown at checkout. Your bank or card issuer may apply its own exchange rate or transaction fees.",
          "Payments are processed through Square. Information entered into Square's hosted checkout is handled under Square's applicable terms and privacy information. You must be authorised to use the payment method submitted.",
          "If a material pricing or listing error is identified before dispatch, we may contact you to confirm the corrected details or cancel the affected order. If we cancel a paid order, we will refund the amount paid to the original payment method, subject to any remedy required by law."
        ],
      },
      {
        heading: "6. Dispatch and delivery",
        paragraphs: [
          "Our typical dispatch timeframe is **3–4 weeks** after we accept your order. Dispatch means handing the parcel to the delivery carrier; it is not the delivery date. Transit time follows dispatch and varies by destination and carrier.",
          "You are responsible for entering a complete and accurate delivery address. Contact us promptly if it needs correcting. We cannot guarantee an address change after dispatch processing has begun.",
          "We will make a reasonable basis assessment of the dispatch timeframe represented when you order. For qualifying U.S. orders, the Federal Trade Commission's Mail, Internet, or Telephone Order Merchandise Rule, 16 C.F.R. Part 435, requires shipment within the represented timeframe or, if none is stated, generally within 30 days. If we cannot meet the applicable timeframe, we will provide the delay notice, revised timeframe, and cancellation and refund option required by that Rule.",
          "If an order is delayed, lost, or damaged in transit, contact us at operations.overstock@gmail.com. We will respond in accordance with applicable law. Nothing in these terms limits rights relating to delivery that cannot lawfully be limited."
        ],
      },
      {
        heading: "7. Change-of-mind cancellations and final sale",
        paragraphs: [
          "All sales are final for change of mind. We do not offer change-of-mind refunds, returns, or exchanges after an order has been dispatched.",
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
          "**© 2026 OVERSTOCK**. Rights in original OVERSTOCK content are reserved, subject to applicable law. Third-party material remains the property of its respective rights holders.",
          "Third-party product names, logos, photographs, and trade marks remain the property of their respective owners. Their use to identify a product does not transfer ownership or imply endorsement.",
          "If you believe material on the website infringes your copyright, email operations.overstock@gmail.com with the page address, identification of the protected work, the material you believe is infringing, your contact details, and a statement explaining your ownership or authority. Copyright notices are handled under applicable law, including the U.S. Digital Millennium Copyright Act (17 U.S.C. § 512) where it applies. OVERSTOCK does not represent that this email address is a registered DMCA designated agent."
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
          "These terms are governed by the laws of New South Wales, Australia, subject to mandatory consumer-protection laws that apply where you live. Courts in New South Wales may hear disputes, but this clause does not prevent you from bringing a claim in another forum where the law gives you that right.",
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
    updated: "LAST UPDATED OCTOBER 15, 2026",
    sections: [
      {
        heading: "1. About this policy",
        paragraphs: [
          "This Privacy Policy explains how OVERSTOCK handles personal information when you visit the OVERSTOCK website, place an order, or contact customer support. OVERSTOCK operates from 24 Eolian Loop, Clayton, Sydney, Australia. For privacy questions, email operations.overstock@gmail.com.",
          "The Privacy Act 1988 (Cth) and Australian Privacy Principles apply to the extent OVERSTOCK is covered by them. U.S. state privacy laws apply where their scope and requirements are met. This policy does not limit rights available to you under applicable law."
        ],
      },
      {
        heading: "2. Information OVERSTOCK handles",
        paragraphs: [
          "OVERSTOCK handles information you provide when placing an order or contacting us, such as your name, email address, delivery address, order details, and customer-service messages. Square processes payment-card information through its hosted checkout; OVERSTOCK receives order and payment-status information needed to manage your purchase.",
          "When you access the website, basic technical information such as browser and device details, security logs, and website activity may be processed to operate, maintain, and protect the service."
        ],
      },
      {
        heading: "3. How information is used",
        paragraphs: [
          "OVERSTOCK uses personal information to accept and manage orders, arrange delivery, send order-related communications, provide customer support, maintain business records, protect the website, prevent fraud, and meet legal obligations.",
          "OVERSTOCK sends marketing communications only where permitted by applicable law. You can opt out using the unsubscribe instructions in a marketing email. Essential order and service messages may still be sent."
        ],
      },
      {
        heading: "4. When information is shared",
        paragraphs: [
          "OVERSTOCK shares information with Square to process payments, delivery carriers to fulfil orders, and service providers that host, store, secure, or support the website and customer communications. Information may also be disclosed where required by law or reasonably necessary to protect legal rights or prevent fraud.",
          "Service providers may handle information under their own privacy terms. OVERSTOCK limits disclosure to information reasonably needed for the relevant service."
        ],
      },
      {
        heading: "5. International handling",
        paragraphs: [
          "OVERSTOCK is based in Australia and sells to customers in the United States. Personal information may be processed in Australia, the United States, or other locations where OVERSTOCK's service providers operate. Where required by law, OVERSTOCK takes reasonable steps to protect personal information disclosed to overseas recipients."
        ],
      },
      {
        heading: "6. Cookies and website technologies",
        paragraphs: [
          "The website may use cookies or similar technologies that are necessary for site operation, security, or remembering preferences. Browser settings can be used to manage or block cookies, although some website functions may then be unavailable. If optional analytics or advertising technologies are used, OVERSTOCK will provide any notice or choice required by applicable law."
        ],
      },
      {
        heading: "7. Retention and security",
        paragraphs: [
          "OVERSTOCK retains personal information for as long as reasonably needed to fulfil the purposes described in this policy, manage orders and disputes, keep required business records, and comply with law. Information that is no longer needed will be securely deleted or de-identified where reasonably practicable.",
          "OVERSTOCK uses reasonable administrative and technical safeguards to protect personal information against loss, misuse, unauthorised access, alteration, or disclosure. No online service can guarantee absolute security."
        ],
      },
      {
        heading: "8. Your privacy choices and rights",
        paragraphs: [
          "You may email operations.overstock@gmail.com to request access to or correction of personal information OVERSTOCK holds about you. OVERSTOCK may need to verify your identity and may refuse or limit a request where the law permits or requires it.",
          "Depending on where you live and the laws that apply, you may have additional rights concerning deletion, portability, or certain uses of your information. Contact OVERSTOCK to make a request. You may also complain to a privacy regulator with authority over your circumstances."
        ],
      },
      {
        heading: "9. Children",
        paragraphs: [
          "The OVERSTOCK website is not directed to children under 13. OVERSTOCK does not knowingly request personal information from children under 13. A parent or guardian who believes a child has provided information may contact operations.overstock@gmail.com."
        ],
      },
      {
        heading: "10. Changes",
        paragraphs: [
          "OVERSTOCK may update this Privacy Policy to reflect changes to the website, information practices, or legal requirements. The current version and its effective date will appear on this page. Material changes will be communicated where required by law."
        ],
      },
    ],
  },
  shipping: {
    title: "SHIPPING",
    updated: "LAST UPDATED OCTOBER 15, 2026",
    sections: [
      {
        heading: "1. Dispatch timeframe",
        paragraphs: [
          "**OVERSTOCK dispatches orders in approximately 3–4 weeks after acceptance.** Dispatch means the parcel has been handed to the delivery carrier. Delivery follows dispatch and varies by destination and carrier."
        ],
      },
      {
        heading: "2. Delivery details",
        paragraphs: [
          "Please check your delivery details carefully at checkout. If you need to correct an address, email operations.overstock@gmail.com as soon as possible. An address change cannot be guaranteed once dispatch processing has begun."
        ],
      },
      {
        heading: "3. Delays",
        paragraphs: [
          "If OVERSTOCK cannot dispatch within the timeframe stated for your order, we will notify you and provide the revised timing and options required by law. For eligible U.S. orders, the **FTC Mail, Internet, or Telephone Order Merchandise Rule (16 C.F.R. Part 435)** requires the option to agree to a delay or cancel for a prompt refund when the promised timeframe cannot be met."
        ],
      },
      {
        heading: "4. Delivery issues",
        paragraphs: [
          "For an order that is delayed, lost, or arrives damaged, contact OVERSTOCK at operations.overstock@gmail.com and include your order number. Your rights under the **Australian Consumer Law** and applicable U.S. consumer-protection laws are not affected."
        ],
      },
    ],
  },
  refunds: {
    title: "REFUND POLICY",
    updated: "LAST UPDATED OCTOBER 15, 2026",
    sections: [
      {
        heading: "1. Change-of-mind sales",
        paragraphs: [
          "**All OVERSTOCK sales are final for change of mind.** Please review the item listing and order details carefully before placing your order."
        ],
      },
      {
        heading: "2. Cancellation before dispatch",
        paragraphs: [
          "You may email operations.overstock@gmail.com to request cancellation before dispatch. Cancellation is effective only when OVERSTOCK confirms it. If the cancellation is confirmed before dispatch, the amount paid will be refunded to the original payment method."
        ],
      },
      {
        heading: "3. After dispatch",
        paragraphs: [
          "After dispatch, OVERSTOCK does not provide change-of-mind refunds, returns, or exchanges. This policy does not limit a refund, repair, replacement, cancellation, or other remedy required by the **Australian Consumer Law**, the **FTC Mail, Internet, or Telephone Order Merchandise Rule**, or other applicable U.S. law."
        ],
      },
      {
        heading: "4. Incorrect, damaged, or faulty items",
        paragraphs: [
          "If an item is incorrect, arrives damaged, or has an undisclosed fault, email operations.overstock@gmail.com promptly with your order number, a short description, and photos where relevant. For confirmed damage, OVERSTOCK will offer a voucher where permitted by law. You do not have to accept a voucher if the law gives you another remedy or choice."
        ],
      },
    ],
  },
  contact: {
    title: "CONTACT",
    sections: [
      {
        heading: "1. Account support",
        paragraphs: [
          "For questions or accessibility issues, contact our support team using the channels below.",
        ],
      },
      {
        heading: "2. Order support",
        paragraphs: [
          "For an order issue, include your order number. If an item arrived damaged, include photos to help us review it.",
        ],
      },
    ],
  },
};

export default async function LegalPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const content = pages[page];
  if (!content) notFound();

  return (
    <main className={`legal-page legal-page-${page}`}>
      <p className="eyebrow">OVERSTOCK / HELP</p>
      <h1>{content.title}</h1>
      {content.updated && <p className="legal-updated">{content.updated}</p>}
      {content.copy?.map((text) => <p key={text}>{renderFormatted(text)}</p>)}
      {content.sections?.map((section) => (
        <section className="legal-section" key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((text) => <p key={text}>{renderFormatted(text)}</p>)}
        </section>
      ))}
      {page === "contact" && (
        <div className="contact-options" aria-label="Contact options">
          {contactOptions.map((option) => (
            <div className="contact-option" key={option.label}>
              <ContactIcon label={option.label} />
              {option.href ? (
                <a
                  className="contact-option-value"
                  href={option.href}
                  aria-label={`${option.label}: ${option.value}`}
                  target={option.label === "EMAIL" ? undefined : "_blank"}
                  rel={option.label === "EMAIL" ? undefined : "noreferrer"}
                >
                  <strong>{option.value}</strong>
                </a>
              ) : (
                <span className="contact-option-value" aria-label={`${option.label}: ${option.value}`}>
                  <strong>{option.value}</strong>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
