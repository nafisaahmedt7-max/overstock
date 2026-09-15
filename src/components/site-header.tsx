"use client";
import Link from "next/link";
import { useCart } from "./cart-provider";
export function SiteHeader() {
  const { count } = useCart();
  return (
    <header className="site-header">
      <Link className="wordmark" href="/">
        <span>OVERSTOCK</span>
        <small>COLLECTIVE</small>
      </Link>
      <nav aria-label="Primary navigation">
        <Link href="/shop/men">MEN</Link>
        <Link href="/shop/women">WOMEN</Link>
        <Link href="/category/tops">TOPS</Link>
        <Link href="/category/bottoms">BOTTOMS</Link>
        <Link href="/category/accessories">ACCESSORIES</Link>
      </nav>
      <Link className="cart-link" href="/cart">
        CART ({count})
      </Link>
    </header>
  );
}
