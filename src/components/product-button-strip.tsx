import Link from "next/link";
import type { Product } from "@/data/products";

type ProductKind = "hoodie" | "jeans" | "tee" | "bag" | "sneaker" | "jacket" | "boots";

const sampleProducts: { name: string; kind: ProductKind }[] = [
  { name: "Oversized T-shirt", kind: "tee" },
  { name: "Utility Backpack", kind: "bag" },
  { name: "Classic Sneakers", kind: "sneaker" },
  { name: "Denim Jacket", kind: "jacket" },
  { name: "White T-shirt", kind: "tee" },
  { name: "Leather Boots", kind: "boots" },
];

function getProductKind(name: string): ProductKind {
  const value = name.toLowerCase();
  if (value.includes("jean") || value.includes("denim")) return "jeans";
  if (value.includes("hoodie")) return "hoodie";
  if (value.includes("bag") || value.includes("backpack")) return "bag";
  if (value.includes("sneaker") || value.includes("runner") || value.includes("shoe")) return "sneaker";
  if (value.includes("boot")) return "boots";
  if (value.includes("jacket") || value.includes("coat")) return "jacket";
  return "tee";
}

function ProductOutline({ kind, label }: { kind: ProductKind; label: string }) {
  return (
    <svg
      className="product-outline"
      viewBox="0 0 200 250"
      role="img"
      aria-label={label}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === "hoodie" && (
        <>
          <path d="M77 48c0-17 10-29 23-29s23 12 23 29l22 12 25 39-20 13-17-25 5 129H62l5-129-17 25-20-13 25-39 22-12Z" />
          <path d="M77 48c4 12 12 19 23 19s19-7 23-19M86 56c2 8 7 12 14 12s12-4 14-12M78 137h44l-5 26H83l-5-26ZM100 69v44" />
          <path d="M88 163v10m24-10v10" />
        </>
      )}
      {kind === "jeans" && (
        <>
          <path d="M58 29h84l-5 66 16 128h-47l-6-112-7 112H46l16-128-4-66Z" />
          <path d="M58 45h83M100 30v31m-28 0h56M100 61l-2 50m-30-16 25 6m39-6-25 6" />
          <path d="M57 95 47 223m96-128 10 128" />
        </>
      )}
      {kind === "tee" && (
        <>
          <path d="m72 39 19-15h18l19 15 38 19-16 39-24-13 7 133H67l7-133-24 13-16-39 38-19Z" />
          <path d="M91 24c1 12 4 20 9 20s8-8 9-20M74 84l9 4m43-4-9 4M69 220h62" />
        </>
      )}
      {kind === "bag" && (
        <>
          <path d="M47 83h106l11 137H36L47 83Z" />
          <path d="M68 83V58c0-19 11-31 32-31s32 12 32 31v25M78 83V59c0-13 7-20 22-20s22 7 22 20v24M63 119h74v61H63z" />
          <path d="M88 148h24m-12-12v24" />
        </>
      )}
      {kind === "sneaker" && (
        <>
          <path d="M28 157c18 2 35-2 47-17l20-25 23 20 29 13c12 5 22 8 28 17l8 26c2 8-3 14-12 14H43c-12 0-18-7-16-18l1-30Z" />
          <path d="m77 140 18 15m-25-5 17 14m-29-4 16 14m-26-2h133M105 135l-7 20m19-12-8 19" />
          <path d="M29 183c23 7 47 10 74 10s53-3 78-10" />
        </>
      )}
      {kind === "jacket" && (
        <>
          <path d="m71 37 19-14h20l19 14 36 22-16 42-23-12 6 131H68l6-131-23 12-16-42 36-22Z" />
          <path d="M90 23c2 13 5 21 10 21s8-8 10-21M100 44v176m-27-134 25 9 25-9M74 85l22 8m30-8-22 8" />
          <path d="m72 105 24 8v31l-25-7m57-32-24 8v31l25-7" />
        </>
      )}
      {kind === "boots" && (
        <>
          <path d="M63 32h61l-1 100 17 19 30 20c10 7 13 17 11 31-1 9-8 14-19 14H43c-12 0-17-7-15-18l4-22c2-10 8-17 18-23l13-9V32Z" />
          <path d="M63 52h61M63 131l60 1m16 19 14 18m-33-12 14 18m-45 31v-68M42 189c35 10 81 13 137 4" />
        </>
      )}
    </svg>
  );
}

export function ProductButtonStrip({ products }: { products: Product[] }) {
  const hoodie = products.find((product) => product.name.toLowerCase().includes("black hoodie"));
  const jeans = products.find((product) => product.name.toLowerCase().includes("jeans"));
  const featured = hoodie && jeans
    ? [hoodie, jeans, hoodie, jeans, hoodie, jeans]
    : products.slice(0, 6);

  return (
    <section className="product-button-strip" aria-label="Product types">
      <style>{`
        .product-button-strip {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1.5rem 1rem 2rem;
          border-bottom: 1px solid #050505;
        }
        .product-button-row {
          display: flex;
          width: min(100%, 100rem);
          margin-inline: auto;
          justify-content: center;
          gap: 1.25rem;
          overflow-x: auto;
          overscroll-behavior-inline: contain;
          scroll-snap-type: x mandatory;
          scrollbar-width: thin;
          padding: .2rem .25rem .65rem;
        }
        .product-button-row a {
          flex: 0 0 clamp(8rem, 14vw, 11rem);
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: .65rem;
          scroll-snap-align: center;
          text-decoration: none;
        }
        .product-button-row a:focus-visible {
          outline: 2px solid #050505;
          outline-offset: 4px;
        }
        .product-button-row .strip-illustration {
          display: flex;
          width: 100%;
          aspect-ratio: 4 / 5;
          align-items: center;
          justify-content: center;
          color: #111;
        }
        .product-button-row .product-outline {
          display: block;
          width: 82%;
          height: 88%;
          overflow: visible;
          transition: transform 180ms ease;
        }
        .product-button-row a:hover .product-outline {
          transform: scale(1.035);
        }
        .product-button-row .strip-title {
          font: 600 .7rem/1.4 var(--font-mono), monospace;
          text-transform: uppercase;
          text-align: center;
          overflow-wrap: anywhere;
        }
        @media (max-width: 600px) {
          .product-button-strip { gap: 1rem; padding-inline: .75rem; }
          .product-button-row {
            justify-content: flex-start;
            gap: .75rem;
          }
          .product-button-row a { flex-basis: 36vw; }
        }
      `}</style>
      <div className="product-button-row" role="group" aria-label="Available products">
        {featured.map((product, index) => (
          <Link
            href={`/product/${product.slug}`}
            aria-label={`View ${product.name}`}
            key={`${product.slug}-${index}`}
          >
            <span className="strip-illustration">
              <ProductOutline kind={getProductKind(product.name)} label={product.name} />
            </span>
            <span className="strip-title">{product.name}</span>
          </Link>
        ))}
      </div>
      <div className="product-button-row" role="group" aria-label="More product type previews">
        {sampleProducts.map((product) => (
          <Link
            href="#new-arrivals"
            aria-label={`${product.name} style preview; browse available products`}
            key={product.name}
          >
            <span className="strip-illustration">
              <ProductOutline kind={product.kind} label={product.name} />
            </span>
            <span className="strip-title">{product.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
