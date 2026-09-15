"use client";

import { useState } from "react";
import type { Product } from "@/data/products";
import { ProductGrid } from "./product-grid";

const types = ["all", "tops", "bottoms", "accessories"] as const;

export function GenderCatalog({ products }: { products: Product[] }) {
  const [active, setActive] = useState<(typeof types)[number]>("all");
  const filtered =
    active === "all"
      ? products
      : products.filter((product) => product.apparelType === active);

  return (
    <>
      <nav className="catalog-filter" aria-label="Apparel categories">
        {types.map((type) => (
          <button
            key={type}
            className={active === type ? "active" : ""}
            onClick={() => setActive(type)}
          >
            {type.toUpperCase()}
          </button>
        ))}
      </nav>
      <div className="catalog-transition" key={active}>
        <ProductGrid products={filtered} />
      </div>
    </>
  );
}
