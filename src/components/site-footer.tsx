import Link from "next/link";
export function SiteFooter() {
  return <footer className="site-footer">
    <div><b>OVERSTOCK</b><span>Independent marketplace / Australia</span></div>
    <nav aria-label="Footer"><Link href="/">SHOP</Link><Link href="/portal/login">SELLER & TEAM LOGIN</Link><Link href="/legal/terms">TERMS</Link><Link href="/legal/privacy">PRIVACY</Link><Link href="/legal/shipping">SHIPPING</Link><Link href="/legal/final-sale">FINAL SALE</Link><Link href="/legal/contact">CONTACT</Link></nav>
  </footer>;
}
