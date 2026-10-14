import Link from "next/link";

export default function CheckoutReturnPage() {
  return (
    <main className="checkout-return">
      <p className="eyebrow">OVERSTOCK / CHECKOUT</p>
      <h1>THANK YOU.</h1>
      <p>Square is confirming your payment. Your card may show the charge in your local currency, while this Australian store processes payments in AUD.</p>
      <p>Your order is not marked as paid until Square confirms it.</p>
      <Link href="/">RETURN TO CATALOG</Link>
    </main>
  );
}
