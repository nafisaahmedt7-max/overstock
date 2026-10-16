"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Product } from "@/data/products";
import { useCart } from "./cart-provider";

type ProductCardItem = Pick<Product, "slug" | "name" | "price" | "sizes" | "status" | "sizeChartUrl">;

export function ProductCardActions({ product }: { product: ProductCardItem }) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartClosing, setChartClosing] = useState(false);
  const { add } = useCart();

  function closeChart() {
    if (chartClosing) return;
    setChartClosing(true);
    window.setTimeout(() => {
      setChartOpen(false);
      setChartClosing(false);
    }, 180);
  }

  useEffect(() => {
    if (!open && !chartOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (chartOpen) {
        if (chartClosing) return;
        setChartClosing(true);
        window.setTimeout(() => {
          setChartOpen(false);
          setChartClosing(false);
        }, 180);
      } else {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, chartOpen, chartClosing]);

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
          setChartOpen(false);
          setChartClosing(false);
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
                onClick={() => {
                  setChartOpen(false);
                  setOpen(false);
                }}
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
            {product.sizeChartUrl && (
              <button
                className="size-chart-link quick-add-size-chart"
                type="button"
                onClick={() => {
                  setChartClosing(false);
                  setChartOpen(true);
                }}
              >
                SIZE CHART
              </button>
            )}
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
      {chartOpen && product.sizeChartUrl && (
        <div
          className={`size-chart-backdrop quick-add-size-chart-backdrop ${chartClosing ? "closing" : ""}`}
          role="presentation"
          onClick={closeChart}
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
                onClick={closeChart}
                aria-label="Close size chart"
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
  );
}
