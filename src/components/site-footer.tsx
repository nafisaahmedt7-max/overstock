import Link from "next/link";
export function SiteFooter() {
  return <footer className="site-footer">
    <div className="footer-main-row">
      <div className="footer-brand"><strong>OVERSTOCK</strong><span>© 2026 OVERSTOCK</span></div>
      <details className="footer-mobile-menu">
        <summary>INFORMATION</summary>
        <nav aria-label="Mobile footer"><Link href="/">SHOP</Link><Link href="/legal/contact">CONTACT</Link><Link href="/legal/terms">TERMS</Link><Link href="/legal/shipping">SHIPPING</Link><Link href="/legal/refunds">REFUNDS</Link></nav>
      </details>
    </div>
    <nav className="footer-desktop-nav" aria-label="Footer"><Link href="/">SHOP</Link><Link href="/legal/contact">CONTACT</Link><Link href="/legal/terms">TERMS</Link><Link href="/legal/shipping">SHIPPING</Link><Link href="/legal/refunds">REFUNDS</Link></nav>
  </footer>;
}
