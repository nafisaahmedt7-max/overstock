export function ProductPlaceholder({ name, tone, index }: { name: string; tone: string; index?: number }) {
  return <div className="product-placeholder" style={{ backgroundColor: tone }} aria-label={`${name} image placeholder`} role="img"><span>{String((index ?? 0) + 1).padStart(2, "0")}</span><strong>PRODUCT IMAGE</strong><small>TRANSPARENT CUTOUT</small></div>;
}
