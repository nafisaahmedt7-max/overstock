import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product-grid";
import { products } from "@/data/products";
export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) { const { category } = await params; if (category !== "men" && category !== "women") notFound(); const filtered = products.filter((product) => product.category === category); return <main><section className="catalog-heading"><h1>{category.toUpperCase()}</h1><p>{filtered.length} PRODUCTS</p></section><ProductGrid products={filtered} /></main>; }
