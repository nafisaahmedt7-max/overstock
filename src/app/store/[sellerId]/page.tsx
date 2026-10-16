import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product-grid";
import { getSellerStore } from "@/data/products";

export const dynamic = "force-dynamic";

export default async function SellerStorePage({
  params,
}: {
  params: Promise<{ sellerId: string }>;
}) {
  const store = await getSellerStore((await params).sellerId);
  if (!store) notFound();

  return (
    <main>
      <header className="catalog-heading">
        <div>
          <p className="eyebrow">SELLER STORE</p>
          <h1>{store.name.toUpperCase()}</h1>
        </div>
        <p>{String(store.products.length).padStart(2, "0")} ITEMS</p>
      </header>
      {store.products.length ? (
        <ProductGrid products={store.products} />
      ) : (
        <section className="empty-state">NO PRODUCTS AVAILABLE</section>
      )}
    </main>
  );
}
