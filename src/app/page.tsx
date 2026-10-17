import { ProductButtonStrip } from "@/components/product-button-strip";
import { ProductGrid } from "@/components/product-grid";
import { getProducts } from "@/data/products";

export const dynamic = "force-dynamic";
export default async function Home() {
  const products = await getProducts();
  return (
    <main>
      <ProductButtonStrip products={products} />
      <section className="catalog-heading" aria-labelledby="new-arrivals">
        <h1 id="new-arrivals">NEW ARRIVALS</h1>
        <p>{products.length} PRODUCTS</p>
      </section>
      <ProductGrid products={products} />
    </main>
  );
}
