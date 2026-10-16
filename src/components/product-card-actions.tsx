"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/data/products";
import { useCart } from "./cart-provider";

type ProductCardItem = Pick<Product, "slug" | "name" | "price" | "sizes" | "status">;

export function ProductCardActions({ product }: { product: ProductCardItem }) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const { add } = useCart();

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 1800);
    return () => window.clearTimeout(timer);
  }, [added]);

  function addSelectedSize() {
    if (!size || product.status === "sold_out") return;
    add({
      slug: product.slug,
      name: product.name,
      price: product.price,
      size,
    });
    setOpen(false);
    setAdded(true);
  }

  return (
    <>
      <button
        className="product-add-button"
        type="button"
        disabled={product.status === "sold_out"}
        aria-haspopup="dialog"
        onClick={() => {
          setSize(product.sizes[0] ?? null);
          setOpen(true);
        }}
      >
        {product.status === "sold_out" ? "SOLD OUT" : added ? "ADDED TO CART" : "ADD TO CART"}
      </button>
      {open && (
        <div
          className="quick-add-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <section
            className="quick-add-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-add-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <h2 id="quick-add-title">SELECT SIZE</h2>
                <p>{product.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close size selector"
              >
                ×
              </button>
            </header>
            <div className="quick-add-sizes" role="group" aria-label="Available sizes">
              {product.sizes.map((option) => (
                <button
                  className={size === option ? "selected" : ""}
                  key={option}
                  type="button"
                  aria-pressed={size === option}
                  onClick={() => setSize(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <button
              className="quick-add-confirm"
              type="button"
              disabled={!size}
              onClick={addSelectedSize}
            >
              ADD TO CART
            </button>
          </section>
        </div>
      )}
        <div
        className={`store-toast ${added ? "show" : ""}`}
        role="status"
        aria-live="polite"
      >
        {product.name} / {size} ADDED TO CART
      </div>
    </>
  );
}
