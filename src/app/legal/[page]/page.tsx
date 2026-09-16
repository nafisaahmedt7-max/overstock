import { notFound } from "next/navigation";
const pages: Record<string, { title: string; copy: string[] }> = {
  terms: { title: "TERMS", copy: ["By using OVERSTOCK you agree to provide accurate order information and use the service lawfully.", "Products are supplied by OVERSTOCK or independent sellers. Availability may change before an order is confirmed.", "These terms do not limit rights that cannot be excluded under Australian law."] },
  privacy: { title: "PRIVACY", copy: ["We collect the information needed to manage accounts, orders, delivery and seller payments.", "Order information is only shown to authorised OVERSTOCK administrators, the relevant seller and the internal fulfillment team where required.", "Contact us to request access or correction of your personal information."] },
  shipping: { title: "SHIPPING", copy: ["Independent sellers send sold products to OVERSTOCK fulfillment. After receipt and preparation, OVERSTOCK sends the customer parcel.", "Tracking is added when available. Delivery estimates are not guarantees and may vary by destination and courier."] },
  "final-sale": { title: "FINAL SALE", copy: ["All purchases are final sale because products are low-cost and may be supplied by independent sellers.", "We do not offer change-of-mind returns or refunds. Nothing on this page excludes remedies required by Australian Consumer Law."] },
  contact: { title: "CONTACT", copy: ["For orders, seller onboarding or privacy requests, contact OVERSTOCK through the official WhatsApp or social account used during onboarding.", "Include your order number, but never send passwords or full payment details."] },
};
export default async function LegalPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params; const content = pages[page]; if (!content) notFound();
  return <main className="legal-page"><p className="eyebrow">OVERSTOCK / HELP</p><h1>{content.title}</h1>{content.copy.map(text => <p key={text}>{text}</p>)}</main>;
}
