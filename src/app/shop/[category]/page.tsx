import { notFound } from "next/navigation";
import { GenderCatalog } from "@/components/gender-catalog";
import { getProducts } from "@/data/products";
export const dynamic = "force-dynamic";
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (category !== "men" && category !== "women") notFound();
  const filtered = (await getProducts()).filter(
    (product) => product.category === category,
  );
  return (
    <main>
      <section className="catalog-heading">
        <h1>{category.toUpperCase()}</h1>
        <p>{filtered.length} PRODUCTS</p>
      </section>
      <GenderCatalog products={filtered} />
    </main>
  );
}
