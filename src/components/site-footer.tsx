"use client";

import Link from "next/link";
import { useRef } from "react";
import type { MouseEvent } from "react";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const menu = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  function follow(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (menu.current) menu.current.open = false;
    if (href === "/" && pathname === "/") {
      event.preventDefault();
      window.location.reload();
    }
  }
  return <footer className="site-footer">
    <div className="footer-main-row">
      <div className="footer-brand"><span>© 2026 OVERSTOCK</span></div>
      <details className="footer-mobile-menu" ref={menu}>
        <summary aria-label="Open footer menu"><span aria-hidden="true">+</span></summary>
        <div className="footer-mobile-overlay">
          <nav aria-label="Mobile footer"><Link href="/" onClick={(event) => follow(event, "/")}>SHOP</Link><Link href="/legal/contact" onClick={(event) => follow(event, "/legal/contact")}>CONTACT</Link><Link href="/legal/terms" onClick={(event) => follow(event, "/legal/terms")}>TERMS</Link><Link href="/legal/shipping" onClick={(event) => follow(event, "/legal/shipping")}>SHIPPING</Link><Link href="/legal/refunds" onClick={(event) => follow(event, "/legal/refunds")}>REFUNDS</Link></nav>
        </div>
      </details>
    </div>
    <nav className="footer-desktop-nav" aria-label="Footer"><Link href="/">SHOP</Link><Link href="/legal/contact">CONTACT</Link><Link href="/legal/terms">TERMS</Link><Link href="/legal/shipping">SHIPPING</Link><Link href="/legal/refunds">REFUNDS</Link></nav>
  </footer>;
}
