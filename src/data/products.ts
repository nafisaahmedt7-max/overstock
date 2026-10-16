import { createClient } from "@/lib/supabase/server";
export type Product = {
  slug: string;
  name: string;
  price: number;
  category: "men" | "women" | "unisex";
  apparelType: string;
  seller: string;
  sellerId: string | null;
  color: string;
  condition: string;
  status: "active" | "sold_out";
  imageTone: string;
  imageUrl: string | null;
  sizeChartUrl: string | null;
  sizes: string[];
  description: string;
};
type Row = {
  slug: string;
  name: string;
  price: number;
  audience: string | null;
  color: string | null;
  image_url: string | null;
  size_chart_url?: string | null;
  sizes: string[];
  description: string | null;
  brand: string | null;
  seller_id: string | null;
  category: string | null;
  condition: string | null;
  status: "active" | "sold_out";
};
function map(row: Row, sellerName?: string | null): Product {
  return {
    slug: row.slug,
    name: row.name,
    price: Number(row.price),
    category:
      row.audience === "women"
        ? "women"
        : row.audience === "unisex"
          ? "unisex"
          : "men",
    apparelType: row.category || "other",
    seller: sellerName || "OVERSTOCK",
    sellerId: sellerName ? row.seller_id : null,
    color: row.color || "UNSPECIFIED",
    condition: row.condition || "PRE-OWNED",
    status: row.status,
    imageTone: "#d0d0cc",
    imageUrl: row.image_url,
    sizeChartUrl: row.size_chart_url ?? "/demo-size-chart.svg",
    sizes: row.sizes.length ? row.sizes : ["ONE SIZE"],
    description:
      row.description || "Independent product supplied through OVERSTOCK.",
  };
}
const productColumns =
  "slug,name,price,audience,category,color,condition,status,image_url,size_chart_url,sizes,description,brand,seller_id";

async function loadProducts(
  sb: Awaited<ReturnType<typeof createClient>>,
  sellerId?: string | null,
) {
  let query = sb
    .from("products")
    .select(productColumns)
    .in("status", ["active", "sold_out"])
    .order("created_at", { ascending: false });
  if (typeof sellerId === "string") query = query.eq("seller_id", sellerId);
  if (sellerId === null) query = query.is("seller_id", null);

  const { data } = await query;
  const rows = (data ?? []) as Row[];
  const sellerIds = [...new Set(rows.flatMap((row) => row.seller_id ? [row.seller_id] : []))];
  const sellersById = new Map<string, string>();
  if (sellerIds.length) {
    const { data: sellers } = await sb
      .from("sellers")
      .select("id,display_name")
      .in("id", sellerIds);
    for (const seller of sellers ?? []) sellersById.set(seller.id, seller.display_name);
  }
  return rows.map((row) => map(row, row.seller_id ? sellersById.get(row.seller_id) : null));
}

export async function getProducts() {
  const sb = await createClient();
  return loadProducts(sb);
}

export async function getProduct(slug: string) {
  const sb = await createClient();
  const { data } = await sb
    .from("products")
    .select(productColumns)
    .in("status", ["active", "sold_out"])
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return undefined;
  const row = data as Row;
  if (!row.seller_id) return map(row);
  const { data: seller } = await sb
    .from("sellers")
    .select("id,display_name")
    .eq("id", row.seller_id)
    .maybeSingle();
  return map(row, seller?.display_name);
}

export async function getSellerStore(id: string) {
  const sb = await createClient();
  if (id === "overstock") {
    return { name: "OVERSTOCK", products: await loadProducts(sb, null) };
  }

  const { data: seller } = await sb
    .from("sellers")
    .select("id,display_name")
    .eq("id", id)
    .maybeSingle();
  if (!seller) return null;
  const products = await loadProducts(sb, id);
  return products.length ? { name: seller.display_name, products } : null;
}
