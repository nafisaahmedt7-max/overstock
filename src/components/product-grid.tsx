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
  const rowsOfSix = (items: Product[]) =>
    Array.from({ length: Math.ceil(items.length / 6) }, (_, index) =>
      items.slice(index * 6, index * 6 + 6),
    );

  return (
    <div className="product-catalog-lanes">
      {lanes.map((lane) => (
        <section className="product-lane" aria-labelledby={`lane-${lane.type}`} key={lane.type}>
          <header><h2 id={`lane-${lane.type}`}>{lane.type.toUpperCase()}</h2><span>{lane.products.length} ITEMS</span></header>
          {rowsOfSix(lane.products).map((row, rowIndex) => (
            <div className="product-grid" aria-label={`${lane.type} products row ${rowIndex + 1}`} tabIndex={0} key={`${lane.type}-${rowIndex}`}>
              {row.map((product, index) => (
                <article className="product-card" data-sold-out={product.status === "sold_out" || undefined} key={product.slug}>
                  <Link href={`/product/${product.slug}`} aria-label={`View ${product.name}`}>
                    <ProductPlaceholder name={product.name} tone={product.imageTone} imageUrl={product.imageUrl} index={rowIndex * 6 + index} />
                    <div className="product-meta">
                      <div><h2>{product.name}</h2><p>{product.condition}</p></div>
                      <div className="product-price"><p>${product.price}</p>{product.status === "sold_out" && <b>SOLD OUT</b>}</div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
