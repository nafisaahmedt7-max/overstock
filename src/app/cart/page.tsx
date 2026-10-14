"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { LocalPrice } from "@/components/local-price";
import { useCurrency } from "@/components/currency-provider";

export default function CartPage() {
  const { items, remove, clear } = useCart();
  const { quote } = useCurrency();
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "", address: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(({ slug, size, quantity }) => ({ slug, size, quantity })),
          customer,
          buyerCurrency: quote?.currency || "USD",
        }),
      });
      const result = (await response.json()) as { checkoutUrl?: string; error?: string };
      if (!response.ok || !result.checkoutUrl) throw new Error(result.error || "Checkout could not start.");
      window.location.assign(result.checkoutUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Checkout could not start.");
      setBusy(false);
    }
  }

  return (
    <main className="cart-page">
      <div className="catalog-heading">
        <h1>CART</h1>
        <p>{items.length} LINES</p>
      </div>
      {items.length === 0 ? (
        <section className="empty-cart">
          <p>YOUR CART IS EMPTY.</p>
          <Link href="/">RETURN TO CATALOG</Link>
        </section>
      ) : (
        <section className="cart-layout">
          <div>
            {items.map((item) => (
              <article className="cart-item" key={`${item.slug}-${item.size}`}>
                <div>
                  <h2>{item.name}</h2>
                  <p>SIZE {item.size} / QTY {item.quantity}</p>
                </div>
                <div>
                  <p><LocalPrice amountUsd={item.price * item.quantity} /></p>
                  <button onClick={() => remove(item.slug, item.size)} type="button">REMOVE</button>
                </div>
              </article>
            ))}
          </div>
          <aside>
            <div><span>SUBTOTAL</span><strong><LocalPrice amountUsd={total} /></strong></div>
            <p className="currency-note">Shown in {quote?.currency || "your local currency"} as an estimate. Square checkout charges in AUD.</p>
            <p className="checkout-disclosure">Shipping and taxes are not included. The Square payment page will show the AUD amount for the products before you pay.</p>
            <form className="checkout-form" onSubmit={checkout}>
              <label>NAME<input autoComplete="name" required value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} /></label>
              <label>EMAIL<input type="email" autoComplete="email" required value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></label>
              <label>PHONE<input type="tel" autoComplete="tel" required value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></label>
              <label>DELIVERY ADDRESS<textarea autoComplete="street-address" required rows={3} value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} /></label>
              {error && <p className="checkout-error" role="alert">{error}</p>}
              <button type="submit" disabled={busy}>{busy ? "OPENING SQUARE..." : "CONTINUE TO CHECKOUT"}</button>
            </form>
            <button className="text-button" onClick={clear} type="button">CLEAR CART</button>
          </aside>
        </section>
      )}
    </main>
  );
}
