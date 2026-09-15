import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product-grid";
import { getProducts } from "@/data/products";
const allowed = ["tops", "bottoms", "accessories"];
export const dynamic = "force-dynamic";
export default async function TypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (!allowed.includes(type)) notFound();
  const products = (await getProducts()).filter((p) => p.apparelType === type);
  return (
    <main>
      <section className="catalog-heading">
        <h1>{type.toUpperCase()}</h1>
        <p>{products.length} PRODUCTS</p>
      </section>
      <ProductGrid products={products} />
    </main>
  );
}
