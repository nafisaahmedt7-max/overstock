"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/data/products";
import { useCart } from "./cart-provider";
export function AddToCart({ product }: { product: Product }) {
  const [size, setSize] = useState(product.sizes[0]);
  const [added, setAdded] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const { add } = useCart();
  useEffect(() => {
    if (!chartOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setChartOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [chartOpen]);
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
      {product.sizeChartUrl && (
        <>
          <button
            className="size-chart-link"
            type="button"
            onClick={() => setChartOpen(true)}
          >
            SIZE CHART
          </button>
          {chartOpen && (
            <div
              className="size-chart-backdrop"
              role="presentation"
              onClick={() => setChartOpen(false)}
            >
              <section
                className="size-chart-dialog"
                role="dialog"
                aria-modal="true"
                aria-label={`${product.name} size chart`}
                onClick={(event) => event.stopPropagation()}
              >
                <header>
                  <h2>SIZE CHART</h2>
                  <button
                    type="button"
                    onClick={() => setChartOpen(false)}
                    aria-label="Close size chart"
                    autoFocus
                  >
                    ×
                  </button>
                </header>
                <Image
                  src={product.sizeChartUrl}
                  alt={`${product.name} size chart`}
                  width={1200}
                  height={900}
                  unoptimized
                />
              </section>
            </div>
          )}
        </>
      )}
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
      <Link
        href="/cart"
        className={`store-toast ${added ? "show" : ""}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-hidden={!added}
        aria-label={added ? `${product.name}, size ${size}, added to cart. View cart.` : undefined}
        tabIndex={added ? 0 : -1}
      >
        {added && (
          <>
            <span>{product.name} / {size} ADDED TO CART</span>
            <strong>VIEW CART</strong>
          </>
        )}
      </Link>
    </div>
  );
}
