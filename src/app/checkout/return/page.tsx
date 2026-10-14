"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type VerificationStatus = "checking" | "paid" | "pending" | "error";

export default function CheckoutReturnPage() {
  const [status, setStatus] = useState<VerificationStatus>("checking");
  const orderNumber = typeof window === "undefined"
    ? ""
    : new URLSearchParams(window.location.search).get("order") || "";

  const verifyPayment = useCallback(async (number: string, active?: () => boolean) => {
    if (!number) {
      setStatus("error");
      return;
    }

    setStatus("checking");
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (active && !active()) return;
      try {
        const response = await fetch(
          "/api/checkout/verify?order=" + encodeURIComponent(number),
          { cache: "no-store" },
        );
        const result = (await response.json()) as { status?: string };
        if (result.status === "paid") {
          if (!active || active()) setStatus("paid");
          return;
        }
        if (!response.ok && response.status !== 503) break;
      } catch {
        // Keep checking briefly in case the return happens before Square finishes.
      }
      if (attempt < 7) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    if (!active || active()) setStatus("pending");
  }, []);

  useEffect(() => {
    let mounted = true;
    void verifyPayment(orderNumber, () => mounted);
    return () => {
      mounted = false;
    };
  }, [orderNumber, verifyPayment]);

  return (
    <main className="checkout-return">
      <p className="eyebrow">OVERSTOCK / CHECKOUT</p>
      <h1>{status === "paid" ? "PAYMENT CONFIRMED." : "THANK YOU."}</h1>
      {status === "checking" && <p>Square is securely confirming your payment. This may take a few seconds.</p>}
      {status === "paid" && <p>Your payment is confirmed and your order is marked as paid.</p>}
      {status === "pending" && (
        <>
          <p>Your payment may still be processing. We have not marked this order as paid yet.</p>
          <button type="button" onClick={() => void verifyPayment(orderNumber)}>CHECK PAYMENT AGAIN</button>
        </>
      )}
      {status === "error" && <p>We could not find this order. Please contact OVERSTOCK with your Square receipt.</p>}
      <p>Your card may show the charge in your local currency, while this Australian store processes payments in AUD.</p>
      <Link href="/">RETURN TO CATALOG</Link>
    </main>
  );
}
