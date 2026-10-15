"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { LocalPrice } from "@/components/local-price";
import { useCurrency } from "@/components/currency-provider";

const countries = [
  { name: "Australia", iso: "AU", dial: "+61" },
  { name: "New Zealand", iso: "NZ", dial: "+64" },
  { name: "United States", iso: "US", dial: "+1" },
  { name: "Canada", iso: "CA", dial: "+1" },
  { name: "United Kingdom", iso: "GB", dial: "+44" },
  { name: "Ireland", iso: "IE", dial: "+353" },
  { name: "Singapore", iso: "SG", dial: "+65" },
  { name: "Japan", iso: "JP", dial: "+81" },
  { name: "South Korea", iso: "KR", dial: "+82" },
  { name: "India", iso: "IN", dial: "+91" },
  { name: "China", iso: "CN", dial: "+86" },
  { name: "Hong Kong", iso: "HK", dial: "+852" },
  { name: "United Arab Emirates", iso: "AE", dial: "+971" },
  { name: "Saudi Arabia", iso: "SA", dial: "+966" },
  { name: "South Africa", iso: "ZA", dial: "+27" },
  { name: "Germany", iso: "DE", dial: "+49" },
  { name: "France", iso: "FR", dial: "+33" },
  { name: "Italy", iso: "IT", dial: "+39" },
  { name: "Spain", iso: "ES", dial: "+34" },
  { name: "Netherlands", iso: "NL", dial: "+31" },
  { name: "Sweden", iso: "SE", dial: "+46" },
  { name: "Norway", iso: "NO", dial: "+47" },
  { name: "Denmark", iso: "DK", dial: "+45" },
  { name: "Switzerland", iso: "CH", dial: "+41" },
  { name: "Mexico", iso: "MX", dial: "+52" },
  { name: "Brazil", iso: "BR", dial: "+55" },
  { name: "Philippines", iso: "PH", dial: "+63" },
  { name: "Malaysia", iso: "MY", dial: "+60" },
  { name: "Indonesia", iso: "ID", dial: "+62" },
  { name: "Thailand", iso: "TH", dial: "+66" },
] as const;

type AddressKey = "street" | "unit" | "city" | "region" | "postalCode" | "country";
type FieldKey = "name" | "email" | "phone" | AddressKey;
type Address = Record<AddressKey, string>;
type Customer = { name: string; email: string; phone: string; address: Address };
type FieldErrors = Partial<Record<FieldKey, string>>;

function validate(customer: Customer, dialCode: string): FieldErrors {
  const errors: FieldErrors = {};
  const name = customer.name.trim();
  const email = customer.email.trim();
  const digits = customer.phone.replace(/\D/g, "").replace(/^0/, "");
  const e164Digits = dialCode.replace(/\D/g, "") + digits;
  if (name.length < 2 || name.length > 100 || !/^[\p{L}\p{M} .’'-]+$/u.test(name)) {
    errors.name = "Enter your first and last name using letters.";
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (digits.length < 6 || digits.length > 14 || e164Digits.length < 8 || e164Digits.length > 15) {
    errors.phone = "Enter a valid phone number for the selected country.";
  }
  const address = customer.address;
  if (address.street.trim().length < 3 || address.street.trim().length > 120) errors.street = "Enter a valid street address.";
  if (address.unit.trim().length > 60) errors.unit = "Keep this under 60 characters.";
  if (address.city.trim().length < 2 || address.city.trim().length > 80) errors.city = "Enter your city or suburb.";
  if (address.region.trim().length < 2 || address.region.trim().length > 80) errors.region = "Enter your state, province, or region.";
  if (address.postalCode.trim().length < 2 || address.postalCode.trim().length > 20 || !/^[\p{L}\p{N} -]+$/u.test(address.postalCode.trim())) {
    errors.postalCode = "Enter a valid postal or ZIP code.";
  }
  if (!countries.some((country) => country.iso === address.country)) errors.country = "Choose your country.";
  return errors;
}

export default function CartPage() {
  const { items, remove, clear } = useCart();
  const { quote } = useCurrency();
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    email: "",
    phone: "",
    address: { street: "", unit: "", city: "", region: "", postalCode: "", country: "AU" },
  });
  const [phoneCountryIso, setPhoneCountryIso] = useState("AU");
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const selectedPhoneCountry = countries.find((country) => country.iso === phoneCountryIso) || countries[0];
  const errors = validate(customer, selectedPhoneCountry.dial);
  const visibleErrors = Object.fromEntries(
    Object.entries(errors).filter(([key]) => touched[key as FieldKey]),
  ) as FieldErrors;

  function setAddress(key: AddressKey, value: string) {
    setCustomer((current) => ({ ...current, address: { ...current.address, [key]: value } }));
  }

  function fieldError(key: FieldKey) {
    return visibleErrors[key] ? <span className="checkout-field-error" id={key + "-error"}>{visibleErrors[key]}</span> : null;
  }

  function markTouched(key: FieldKey) {
    setTouched((current) => ({ ...current, [key]: true }));
  }

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setTouched(Object.fromEntries(
      ["name", "email", "phone", "street", "unit", "city", "region", "postalCode", "country"].map((key) => [key, true]),
    ));
    if (Object.keys(errors).length > 0) {
      setError("Please check the highlighted details before continuing.");
      return;
    }
    setBusy(true);
    try {
      const phoneDigits = customer.phone.replace(/\D/g, "").replace(/^0/, "");
      const phone = selectedPhoneCountry.dial + phoneDigits;
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(({ slug, size, quantity }) => ({ slug, size, quantity })),
          customer: {
            name: customer.name.trim(),
            email: customer.email.trim().toLowerCase(),
            phone,
            address: Object.fromEntries(
              Object.entries(customer.address).map(([key, value]) => [key, value.trim()]),
            ),
          },
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

  const inputProps = (key: FieldKey) => ({
    "aria-invalid": Boolean(visibleErrors[key]),
    "aria-describedby": visibleErrors[key] ? key + "-error" : undefined,
    onBlur: () => markTouched(key),
  });

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
            <form className="checkout-form checkout-form-professional" onSubmit={checkout} noValidate>
              <div className="checkout-section-heading">
                <span className="checkout-step">01</span>
                <div><h2>Contact details</h2><p>We’ll send your order confirmation here.</p></div>
              </div>
              <label className="checkout-field">
                <span>Full name <b>*</b></span>
                <input autoComplete="name" required maxLength={100} value={customer.name} {...inputProps("name")} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
                {fieldError("name")}
              </label>
              <label className="checkout-field">
                <span>Email address <b>*</b></span>
                <input type="email" autoComplete="email" inputMode="email" required maxLength={254} value={customer.email} {...inputProps("email")} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
                {fieldError("email")}
              </label>
              <label className="checkout-field">
                <span>Phone number <b>*</b></span>
                <div className="phone-input-row">
                  <select aria-label="Phone country code" value={phoneCountryIso} onChange={(e) => {
                    setPhoneCountryIso(e.target.value);
                    markTouched("phone");
                  }}>
                    {countries.map((country) => <option key={country.iso} value={country.iso}>{country.iso} {country.dial}</option>)}
                  </select>
                  <input type="tel" autoComplete="tel-national" inputMode="tel" required maxLength={24} placeholder="Your number" value={customer.phone} {...inputProps("phone")} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
                </div>
                <small className="checkout-field-hint">Country code {selectedPhoneCountry.dial} will be added automatically.</small>
                {fieldError("phone")}
              </label>
              <div className="checkout-section-heading checkout-address-heading">
                <span className="checkout-step">02</span>
                <div><h2>Delivery address</h2><p>Enter the address where you’d like your order delivered.</p></div>
              </div>
              <label className="checkout-field">
                <span>Street address <b>*</b></span>
                <input autoComplete="address-line1" required maxLength={120} placeholder="House number and street name" value={customer.address.street} {...inputProps("street")} onChange={(e) => setAddress("street", e.target.value)} />
                {fieldError("street")}
              </label>
              <label className="checkout-field">
                <span>Apartment, suite, etc. <small>Optional</small></span>
                <input autoComplete="address-line2" maxLength={60} value={customer.address.unit} {...inputProps("unit")} onChange={(e) => setAddress("unit", e.target.value)} />
                {fieldError("unit")}
              </label>
              <label className="checkout-field">
                <span>City or suburb <b>*</b></span>
                <input autoComplete="address-level2" required maxLength={80} value={customer.address.city} {...inputProps("city")} onChange={(e) => setAddress("city", e.target.value)} />
                {fieldError("city")}
              </label>
              <div className="checkout-field-row">
                <label className="checkout-field">
                  <span>State / province / region <b>*</b></span>
                  <input autoComplete="address-level1" required maxLength={80} value={customer.address.region} {...inputProps("region")} onChange={(e) => setAddress("region", e.target.value)} />
                  {fieldError("region")}
                </label>
                <label className="checkout-field">
                  <span>Postal / ZIP code <b>*</b></span>
                  <input autoComplete="postal-code" required maxLength={20} value={customer.address.postalCode} {...inputProps("postalCode")} onChange={(e) => setAddress("postalCode", e.target.value)} />
                  {fieldError("postalCode")}
                </label>
              </div>
              <label className="checkout-field">
                <span>Country <b>*</b></span>
                <select autoComplete="country" required value={customer.address.country} {...inputProps("country")} onChange={(e) => setAddress("country", e.target.value)}>
                  {countries.map((country) => <option key={country.iso} value={country.iso}>{country.name}</option>)}
                </select>
                {fieldError("country")}
              </label>
              <p className="checkout-secure-note">Your details are used to process and deliver this order.</p>
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
