import Link from "next/link";
import type { Product } from "@/data/products";
import { ProductPlaceholder } from "./product-placeholder";
export function ProductGrid({ products }: { products: Product[] }) {
  const laneOrder = ["tops", "bottoms", "accessories", "other"];
  const lanes = laneOrder
    .map((type) => ({
      type,
      products: products.filter((product) =>
        type === "other"
          ? !laneOrder.slice(0, 3).includes(product.apparelType)
          : product.apparelType === type,
      ),
    }))
    .filter((lane) => lane.products.length > 0);

  return (
    <div className="product-catalog-lanes">
      {lanes.map((lane) => (
        <section className="product-lane" aria-labelledby={`lane-${lane.type}`} key={lane.type}>
          <header><h2 id={`lane-${lane.type}`}>{lane.type.toUpperCase()}</h2><span>{lane.products.length} ITEMS</span></header>
          <div className="product-grid" aria-label={`${lane.type} products`} tabIndex={0}>
            {lane.products.map((product, index) => (
              <article className="product-card" key={product.slug}>
                <Link href={`/product/${product.slug}`} aria-label={`View ${product.name}`}>
                  <ProductPlaceholder name={product.name} tone={product.imageTone} imageUrl={product.imageUrl} index={index} />
                  <div className="product-meta">
                    <div><h2>{product.name}</h2><p>{product.seller}</p></div>
                    <p>${product.price}</p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
