"use client";
import Link from "next/link";
import { useCart } from "./cart-provider";
export function SiteHeader() { const { count } = useCart(); return <header className="site-header"><Link className="wordmark" href="/">FORM</Link><nav aria-label="Primary navigation"><Link href="/shop/men">MEN</Link><Link href="/shop/women">WOMEN</Link></nav><Link className="cart-link" href="/cart">CART ({count})</Link></header>; }
