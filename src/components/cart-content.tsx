"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { validateRequiredFields } from "@/lib/form-validation";
import { phoneCountryCodes } from "@/data/phone-country-codes";

const checkoutCountries = Array.from(
  new Set(phoneCountryCodes.map(([country]) => country)),
).sort((a, b) => a.localeCompare(b));

export function CartContent({
  productImages,
  localCheckoutTest = false,
}: {
  productImages: Record<string, string | null>;
  localCheckoutTest?: boolean;
}) {
  const { items, remove, clear } = useCart();
  const router = useRouter();
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [phoneCountryIndex, setPhoneCountryIndex] = useState(() => {
    const unitedStatesIndex = phoneCountryCodes.findIndex(
      ([country, code]) => country === "United States" && code === "+1",
    );
    return unitedStatesIndex >= 0 ? unitedStatesIndex : 0;
  });
  const phoneCountryCode = phoneCountryCodes[phoneCountryIndex]?.[1] ?? "+1";
  const [phoneCountryCodeSelected, setPhoneCountryCodeSelected] = useState(false);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  async function startCheckoutPreview(formData: FormData) {
    if (checkoutPending || items.length === 0) return;
    setCheckoutError("");

    if (!localCheckoutTest) {
      setCheckoutError("Order confirmation email testing is available on your local server only.");
      return;
    }

    setCheckoutPending(true);
    try {
      const response = await fetch("/api/local-test/order-confirmation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items,
          customer: Object.fromEntries(formData.entries()),
        }),
      });
      const result = (await response.json()) as {
        orderNumber?: string;
        error?: string;
      };

      if (!response.ok || !result.orderNumber) {
        throw new Error(result.error || "Could not send the local test confirmation.");
      }

      clear();
      router.push(`/checkout/thank-you?order=${encodeURIComponent(result.orderNumber)}`);
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Could not send the local test confirmation.",
      );
      setCheckoutPending(false);
    }
  }

  return (
    <main className="cart-page">
      <div className="catalog-heading">
        <h1>CART</h1>
        <p>
          {itemCount} {itemCount === 1 ? "ITEM" : "ITEMS"}
        </p>
      </div>
      {items.length === 0 ? (
        <section className="empty-cart">
          <p>YOUR CART IS EMPTY.</p>
          <Link href="/">RETURN TO CATALOG</Link>
        </section>
      ) : (
        <section className="cart-layout">
          <div className="cart-item-section">
            <p className="eyebrow">OVERSTOCK / ITEMS</p>
            <div className={`cart-items${items.length === 1 ? " cart-items-single" : ""}`}>
            {items.map((item) => {
              const imageUrl = item.imageUrl ?? productImages[item.slug];
              return (
                <article className="cart-item" key={`${item.slug}-${item.size}`}>
                  <Link
                    className="cart-item-image"
                    href={`/product/${item.slug}`}
                    aria-label={`View ${item.name}`}
                  >
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={item.name}
                        fill
                        sizes="(max-width: 600px) 4.5rem, 6.5rem"
                        unoptimized
                        style={{ objectFit: "contain", padding: "1%" }}
                      />
                    ) : (
                      <span>OVERSTOCK</span>
                    )}
                  </Link>
                  <div className="cart-item-info">
                    <Link href={`/product/${item.slug}`}>
                      <h2>{item.name}</h2>
                    </Link>
                    <p>
                      SIZE {item.size} <span aria-hidden="true">·</span> QTY {item.quantity}
                    </p>
                  </div>
                  <div className="cart-item-total">
                    <p>${(item.price * item.quantity).toFixed(2)}</p>
                    <button
                      onClick={() => remove(item.slug, item.size)}
                      type="button"
                      aria-label={`Remove ${item.name}, size ${item.size}`}
                    >
                      REMOVE
                    </button>
                  </div>
                </article>
              );
            })}
            </div>
          </div>
          <aside className="cart-summary">
            <p className="eyebrow">ORDER SUMMARY</p>
            <div>
              <span>SUBTOTAL</span>
              <strong>${total.toFixed(2)}</strong>
            </div>
            <p>Applicable taxes are calculated at checkout.</p>
            <form
              className="local-checkout-form"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                const validationError = validateRequiredFields(event.currentTarget);
                if (validationError) {
                  setCheckoutError(validationError);
                  return;
                }
                setCheckoutError("");
                void startCheckoutPreview(new FormData(event.currentTarget));
              }}
            >
              <p className="local-checkout-form-title">DELIVERY DETAILS</p>
              <label>
                Full name
                <input name="fullName" autoComplete="name" placeholder="ALEX MORGAN" maxLength={100} required />
              </label>
              <label>
                Email address
                <input name="email" type="email" autoComplete="email" placeholder="ALEX@EMAIL.COM" maxLength={254} required />
              </label>
              <div className="local-phone-group">
                <label className="local-phone-group-title" htmlFor="checkout-phone-number">Phone number</label>
                <div className="local-phone-fields">
                  <span className="local-phone-code-control" data-selected={phoneCountryCodeSelected}>
                    <span className="local-phone-code-value" aria-hidden="true">{phoneCountryCode}</span>
                    <input type="hidden" name="phoneCountryCode" value={phoneCountryCode} />
                    <select
                      autoComplete="tel-country-code"
                      value={String(phoneCountryIndex)}
                      onChange={(event) => {
                        setPhoneCountryIndex(Number(event.target.value));
                        setPhoneCountryCodeSelected(true);
                      }}
                      aria-label="Phone country calling code"
                    >
                      {phoneCountryCodes.map(([country, code], index) => (
                        <option key={`${country}-${code}-${index}`} value={index}>
                          {country.toUpperCase()} ({code})
                        </option>
                      ))}
                    </select>
                    <span className="local-phone-code-chevron" aria-hidden="true" />
                  </span>
                  <input
                    id="checkout-phone-number"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="212 555 0123"
                    maxLength={32}
                  />
                </div>
              </div>
              <label>
                Address line 1
                <input name="addressLine1" autoComplete="address-line1" placeholder="123 MARKET ST" maxLength={120} required />
              </label>
              <label>
                Address line 2 <span>(optional)</span>
                <input name="addressLine2" autoComplete="address-line2" placeholder="APT 4B" maxLength={120} />
              </label>
              <div className="local-checkout-form-grid">
                <label>
                  City
                  <input name="city" autoComplete="address-level2" placeholder="SAN FRANCISCO" maxLength={80} required />
                </label>
                <label>
                  State / region
                  <input name="region" autoComplete="address-level1" placeholder="CA" maxLength={80} required />
                </label>
              </div>
              <label>
                Postal code
                <input name="postalCode" autoComplete="postal-code" placeholder="94105" maxLength={24} required />
              </label>
              <label>
                Country
                <select name="country" autoComplete="country-name" defaultValue="United States" required>
                  {checkoutCountries.map((country) => (
                    <option key={country} value={country}>{country.toUpperCase()}</option>
                  ))}
                </select>
              </label>
              <button type="submit" disabled={checkoutPending}>
                {checkoutPending ? "SENDING TEST RECEIPT..." : "CONTINUE TO CHECKOUT"}
              </button>
              <p className="local-checkout-note">
                {localCheckoutTest
                  ? "LOCAL TEST ONLY · NO PAYMENT OR LIVE ORDER · RECEIPT CAPTURED IN MAILPIT"
                  : "PREVIEW ONLY · EMAIL TESTING IS AVAILABLE ON YOUR LOCAL SERVER"}
              </p>
              {checkoutError && <p className="local-checkout-error" role="alert">{checkoutError}</p>}
            </form>
            <button className="text-button" onClick={clear} type="button">
              CLEAR CART
            </button>
          </aside>
        </section>
      )}
    </main>
  );
}
