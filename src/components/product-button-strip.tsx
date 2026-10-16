import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/data/products";

export function ProductButtonStrip({ products }: { products: Product[] }) {
  const hoodie = products.find((product) => product.name.toLowerCase().includes("black hoodie"));
  const jeans = products.find((product) => product.name.toLowerCase().includes("jeans"));
  const featured = hoodie && jeans
    ? [hoodie, jeans, hoodie, jeans, hoodie, jeans]
    : products.slice(0, 6);

  return (
    <section className="product-button-strip" aria-label="Browse featured products">
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
          flex: 0 0 clamp(8rem, 16vw, 13rem);
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
        .product-button-row .strip-image {
          position: relative;
          display: block;
          width: 100%;
          aspect-ratio: 4 / 5;
          background: #f1f1ef;
          overflow: hidden;
        }
        .product-button-row img {
          object-fit: contain;
          padding: 8%;
          transition: transform 180ms ease;
        }
        .product-button-row a:hover img {
          transform: scale(1.035);
        }
        .product-button-row .strip-image-empty {
          width: 100%;
          aspect-ratio: 4 / 5;
          background: #f1f1ef;
        }
        .product-button-row .strip-title {
          font: 600 .7rem/1.4 var(--font-mono), monospace;
          text-transform: uppercase;
          text-align: center;
          overflow-wrap: anywhere;
        }
        @media (max-width: 600px) {
          .product-button-strip { gap: .75rem; padding-inline: .75rem; }
          .product-button-row {
            justify-content: flex-start;
            gap: .75rem;
          }
          .product-button-row a { flex-basis: 36vw; }
        }
      `}</style>
      {[0, 1].map((rowIndex) => (
        <div className="product-button-row" role="group" aria-label={`Featured products row ${rowIndex + 1}`} key={rowIndex}>
          {featured.map((product, index) => (
            <Link
              href={`/product/${product.slug}`}
              aria-label={`View ${product.name}`}
              key={`${product.slug}-${rowIndex}-${index}`}
            >
              {product.imageUrl ? (
                <span className="strip-image">
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    sizes="(max-width: 600px) 36vw, 16vw"
                  />
                </span>
              ) : (
                <span className="strip-image-empty" aria-hidden="true" />
              )}
              <span className="strip-title">{product.name}</span>
            </Link>
          ))}
        </div>
      ))}
    </section>
  );
}
