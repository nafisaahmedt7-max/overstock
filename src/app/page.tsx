import { ProductGrid } from "@/components/product-grid";
import { products } from "@/data/products";

export default function Home() {
  return <main><section className="catalog-heading" aria-labelledby="new-arrivals"><h1 id="new-arrivals">NEW ARRIVALS</h1><p>{products.length} PRODUCTS</p></section><ProductGrid products={products} /></main>;
}
