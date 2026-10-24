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
      <p className="eyebrow">OVERSTOCK / ORDER CONFIRMATION</p>
      <h1>THANK YOU.</h1>
      <p className="checkout-thank-you-message">
        Your order confirmation email is ready in Mailpit.
      </p>
      {orderNumber && (
        <p className="checkout-test-order-number">
          <span>ORDER NUMBER</span>
          <strong className="checkout-test-order-pill">{orderNumber}</strong>
        </p>
      )}
      <p className="checkout-test-disclaimer">
        TEST CHECKOUT · NO PAYMENT WAS PROCESSED · NO LIVE ORDER WAS CREATED
      </p>
      <Link className="checkout-test-return" href="/">
        CONTINUE SHOPPING
      </Link>
    </main>
  );
}
