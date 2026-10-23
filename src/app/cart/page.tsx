import { CartContent } from "@/components/cart-content";
import { getProducts } from "@/data/products";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const products = await getProducts();
  const productImages = Object.fromEntries(
    products.map((product) => [product.slug, product.imageUrl]),
  );

  return <CartContent productImages={productImages} localCheckoutTest={process.env.NODE_ENV === "development"} />;
}
