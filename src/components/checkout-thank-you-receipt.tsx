"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

type ReceiptItem = {
  name: string;
  size: string;
  quantity: number;
  price: number;
  imageUrl?: string | null;
};

type ReceiptDetails = {
  orderNumber: string;
  customer: Record<string, string>;
  items: ReceiptItem[];
  itemTotal: number;
};

function readReceipt(value: string | null, expectedOrderNumber: string): ReceiptDetails | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ReceiptDetails>;
    if (
      parsed.orderNumber !== expectedOrderNumber ||
      !parsed.customer ||
      !Array.isArray(parsed.items) ||
      typeof parsed.itemTotal !== "number"
    ) return null;

    return {
      orderNumber: expectedOrderNumber,
      customer: parsed.customer,
      items: parsed.items.filter((item) =>
        item && typeof item.name === "string" && typeof item.size === "string" &&
        Number.isFinite(item.quantity) && Number.isFinite(item.price),
      ),
      itemTotal: parsed.itemTotal,
    };
  } catch {
    return null;
  }
}

const money = (value: number) => `$${value.toFixed(2)}`;

export function CheckoutThankYouReceipt({ orderNumber }: { orderNumber: string | null }) {
  const [receipt, setReceipt] = useState<ReceiptDetails | null>(null);

  useEffect(() => {
    if (!orderNumber) return;
    setReceipt(readReceipt(sessionStorage.getItem(`overstock:local-receipt:${orderNumber}`), orderNumber));
  }, [orderNumber]);

  const customer = receipt?.customer;
  const firstName = customer?.fullName?.trim().split(/\s+/)[0];
  const address = customer
    ? [
        customer.fullName,
        customer.addressLine1,
        customer.addressLine2,
        [customer.city, customer.region, customer.postalCode].filter(Boolean).join(" "),
        customer.country,
      ].filter(Boolean)
    : [];
  const phone = customer?.phone?.trim();
  const phoneCountryCode = customer?.phoneCountryCode?.trim();
  const formattedPhone = phone
    ? `${phoneCountryCode && !phone.startsWith(phoneCountryCode) ? `${phoneCountryCode} ` : ""}${phone}`
    : "";
  const contact = customer ? [customer.email, formattedPhone].filter(Boolean) : [];

  return (
    <main className="checkout-thank-you">
      <p className="eyebrow">OVERSTOCK / ORDER CONFIRMATION</p>
      <h1>THANK YOU{firstName ? `, ${firstName.toUpperCase()}` : ""}</h1>
      <p className="checkout-thank-you-message">
        YOUR ORDER IS CONFIRMED AND IS BEING PREPARED FOR SHIPPING.
      </p>

      {orderNumber && (
        <section className="checkout-receipt" aria-label="Order confirmation receipt">
          <div className="checkout-receipt-order">
            <span>ORDER NUMBER</span>
            <strong>{orderNumber}</strong>
          </div>

          {receipt && (
            <>
              <div className="checkout-receipt-columns">
                <section>
                  <h2>DELIVERY ADDRESS</h2>
                  <p>{address.map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</p>
                </section>
                <section>
                  <h2>CONTACT</h2>
                  <p>{contact.map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</p>
                </section>
              </div>

              <section className="checkout-receipt-items">
                <h2>ORDER SUMMARY</h2>
                {receipt.items.map((item, index) => (
                  <div className="checkout-receipt-item" key={`${item.name}-${item.size}-${index}`}>
                    <div className="checkout-receipt-item-image">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} width={84} height={100} unoptimized />
                      ) : null}
                    </div>
                    <span className="checkout-receipt-item-name">
                      {item.name}<small>SIZE {item.size} · QTY × {item.quantity}</small>
                    </span>
                    <strong>{money(item.price * item.quantity)}</strong>
                  </div>
                ))}
              </section>

              <div className="checkout-receipt-summary">
                <div><span>ITEM TOTAL</span><strong>{money(receipt.itemTotal)}</strong></div>
                <div><span>DELIVERY</span><span>Calculated at checkout</span></div>
                <div className="checkout-receipt-taxes">
                  <span>TAXES</span>
                  <span>Calculated at checkout<small>(ALL AMOUNTS SHOWN IN USD)</small></span>
                </div>
                <div className="checkout-receipt-total"><strong>ORDER TOTAL</strong><strong>{money(receipt.itemTotal)}</strong></div>
              </div>
            </>
          )}
          {!receipt && <p className="checkout-receipt-unavailable">Order details are unavailable in this browser session.</p>}
        </section>
      )}

      <Link className="checkout-test-return" href="/">
        CONTINUE SHOPPING
      </Link>
      <p className="checkout-thank-you-help">
        Need help with your order? For any queries about your purchase or delivery,{" "}
        <a href="mailto:operations.overstock@gmail.com">contact us</a>.
      </p>
      <p className="checkout-thank-you-shipping" role="note">
        <span className="checkout-thank-you-shipping-icon" aria-hidden="true">i</span>
        <span>SHIPPING CONFIRMATION WILL BE SENT TO YOUR EMAIL AFTER DISPATCH.</span>
      </p>
    </main>
  );
}
