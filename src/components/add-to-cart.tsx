"use client";
import { useState } from "react";
import type { Product } from "@/data/products";
import { useCart } from "./cart-provider";
export function AddToCart({ product }: { product: Product }) {
  const [size, setSize] = useState(product.sizes[0]);
  const [added, setAdded] = useState(false);
  const { add } = useCart();
  return (
    <div className="purchase-panel">
      <fieldset>
        <legend>SELECT SIZE</legend>
        <div className="size-grid">
          {product.sizes.map((option) => (
            <button
              className={size === option ? "selected" : ""}
              key={option}
              type="button"
              onClick={() => setSize(option)}
              aria-pressed={size === option}
            >
              {option}
            </button>
          ))}
        </div>
      </fieldset>
      <button
        className="add-button"
        type="button"
        disabled={product.status === "sold_out"}
        onClick={() => {
          if (product.status === "sold_out") return;
          add({
            slug: product.slug,
            name: product.name,
            price: product.price,
            size,
          });
          setAdded(true);
          window.setTimeout(() => setAdded(false), 2400);
        }}
      >
        {product.status === "sold_out" ? "CURRENTLY OUT OF STOCK" : added ? "ADDED TO CART" : "ADD TO CART"}
      </button>
      <div
        className={`store-toast ${added ? "show" : ""}`}
        role="status"
        aria-live="polite"
      >
        {product.name} / {size} ADDED TO CART
      </div>
    </div>
  );
}
