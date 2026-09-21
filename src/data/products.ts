import { createClient } from "@/lib/supabase/server";
export type Product = {
  slug: string;
  name: string;
  price: number;
  category: "men" | "women" | "unisex";
  apparelType: string;
  seller: string;
  color: string;
  condition: string;
  status: "active" | "sold_out";
  imageTone: string;
  imageUrl: string | null;
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
  sizes: string[];
  description: string | null;
  brand: string | null;
  category: string | null;
  condition: string | null;
  status: "active" | "sold_out";
};
function map(row: Row): Product {
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
    seller: row.brand || "OVERSTOCK",
    color: row.color || "UNSPECIFIED",
    condition: row.condition || "PRE-OWNED",
    status: row.status,
    imageTone: "#d0d0cc",
    imageUrl: row.image_url,
    sizes: row.sizes.length ? row.sizes : ["ONE SIZE"],
    description:
      row.description || "Independent product supplied through OVERSTOCK.",
  };
}
export async function getProducts() {
  const sb = await createClient();
  const { data } = await sb
    .from("products")
    .select(
      "slug,name,price,audience,category,color,condition,status,image_url,sizes,description,brand",
    )
    .in("status", ["active", "sold_out"])
    .order("created_at", { ascending: false });
  return (data ?? []).map(map);
}
export async function getProduct(slug: string) {
  const sb = await createClient();
  const { data } = await sb
    .from("products")
    .select(
      "slug,name,price,audience,category,color,condition,status,image_url,sizes,description,brand",
    )
    .in("status", ["active", "sold_out"])
    .eq("slug", slug)
    .maybeSingle();
  return data ? map(data) : undefined;
}
