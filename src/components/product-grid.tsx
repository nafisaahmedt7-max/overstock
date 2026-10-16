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
          <header>
            <h2 id={`lane-${lane.type}`}>{lane.type.toUpperCase()}</h2>
            <span>{lane.products.length} ITEMS</span>
          </header>
          <div className="product-grid" aria-label={`${lane.type} products`} tabIndex={0}>
            {lane.products.map((product, index) => {
              const productHref = `/product/${product.slug}`;
              return (
                <article className="product-card" data-sold-out={product.status === "sold_out" || undefined} key={product.slug}>
                  <Link className="product-image-link" href={productHref} aria-label={`View ${product.name}`}>
                    <ProductPlaceholder
                      name={product.name}
                      tone={product.imageTone}
                      imageUrl={product.imageUrl}
                      index={index}
                    />
                  </Link>
                  <div className="product-meta">
                    <div className="product-meta-main">
                      <p className="product-condition">{product.condition}</p>
                      <div className="product-meta-details">
                        <Link className="product-title-link" href={productHref}>
                          <h2>{product.name}</h2>
                        </Link>
                      </div>
                      <div className="product-price">
                        <p>${product.price}</p>
                        {product.status === "sold_out" && <b>SOLD OUT</b>}
                      </div>
                    </div>
                    <div className="product-store-row">
                      <Link
                        className="product-store-link"
                        href={`/store/${product.sellerId ?? "overstock"}`}
                        aria-label={`Shop ${product.seller} store`}
                      >
                        SHOP {product.seller.toUpperCase()}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
