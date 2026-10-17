"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";

export function CartContent({
  productImages,
}: {
  productImages: Record<string, string | null>;
}) {
  const { items, remove, clear } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

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
            <button type="button">CONTINUE TO CHECKOUT</button>
            <button className="text-button" onClick={clear} type="button">
              CLEAR CART
            </button>
          </aside>
        </section>
      )}
    </main>
  );
}
