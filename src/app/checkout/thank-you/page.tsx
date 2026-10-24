import { CheckoutThankYouReceipt } from "@/components/checkout-thank-you-receipt";

export default async function LocalCheckoutThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  const orderNumber = order && /^OS-\d{8}$/.test(order) ? order : null;

  return <CheckoutThankYouReceipt orderNumber={orderNumber} />;
}
