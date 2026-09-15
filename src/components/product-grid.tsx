import Link from "next/link";
import type { Product } from "@/data/products";
import { ProductPlaceholder } from "./product-placeholder";
export function ProductGrid({ products }: { products: Product[] }) {
  return <section className="product-grid" aria-label="Product catalog">{products.map((product, index) => <article className="product-card" key={product.slug}><Link href={`/product/${product.slug}`} aria-label={`View ${product.name}`}><ProductPlaceholder name={product.name} tone={product.imageTone} index={index} /><div className="product-meta"><div><h2>{product.name}</h2><p>{product.seller}</p></div><p>${product.price}</p></div></Link></article>)}</section>;
}
