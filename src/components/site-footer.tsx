import Link from "next/link";
export function SiteFooter() {
  return <footer className="site-footer">
    <div className="footer-main-row">
      <div className="footer-brand"><span>© 2026 OVERSTOCK</span></div>
      <details className="footer-mobile-menu">
        <summary aria-label="Open footer menu"><span aria-hidden="true">+</span></summary>
        <div className="footer-mobile-overlay">
          <nav aria-label="Mobile footer"><Link href="/">SHOP</Link><Link href="/legal/contact">CONTACT</Link><Link href="/legal/terms">TERMS</Link><Link href="/legal/shipping">SHIPPING</Link><Link href="/legal/refunds">REFUNDS</Link></nav>
        </div>
      </details>
    </div>
    <nav className="footer-desktop-nav" aria-label="Footer"><Link href="/">SHOP</Link><Link href="/legal/contact">CONTACT</Link><Link href="/legal/terms">TERMS</Link><Link href="/legal/shipping">SHIPPING</Link><Link href="/legal/refunds">REFUNDS</Link></nav>
  </footer>;
}
