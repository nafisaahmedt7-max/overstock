import Link from "next/link";

export default async function LocalCheckoutThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  const orderNumber = order && /^OS-\d{8}$/.test(order) ? order : null;

  return (
    <main className="checkout-thank-you">
      <p className="eyebrow">OVERSTOCK / LOCAL CHECKOUT TEST</p>
      <h1>THANK YOU.</h1>
      <p className="checkout-thank-you-message">
        Your order confirmation has been sent to Mailpit for preview.
      </p>
      {orderNumber && (
        <p className="checkout-test-order-number">
          <span>ORDER NUMBER</span>
          <strong>{orderNumber}</strong>
        </p>
      )}
      <p className="checkout-test-disclaimer">
        This local test did not process a payment or create a live order.
      </p>
      <Link className="checkout-test-return" href="/">
        CONTINUE SHOPPING
      </Link>
    </main>
  );
}
