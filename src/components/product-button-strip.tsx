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
    <section className="product-button-strip" aria-label="Browse all products">
      <style>{`
        .product-button-strip {
          display: flex;
          gap: 1.25rem;
          overflow-x: auto;
          overscroll-behavior-inline: contain;
          scroll-snap-type: x mandatory;
          padding: 1.5rem 1rem 2rem;
          scrollbar-width: thin;
          border-bottom: 1px solid #050505;
        }
        .product-button-strip a {
          flex: 0 0 clamp(8rem, 16vw, 13rem);
          display: flex;
          flex-direction: column;
          gap: .65rem;
          scroll-snap-align: start;
          text-decoration: none;
        }
        .product-button-strip a:focus-visible {
          outline: 2px solid #050505;
          outline-offset: 4px;
        }
        .product-button-strip .strip-image {
          position: relative;
          display: block;
          width: 100%;
          aspect-ratio: 4 / 5;
          background: #f1f1ef;
          overflow: hidden;
          box-shadow: 0 2px 9px rgba(0, 0, 0, .10);
          transition: box-shadow 180ms ease;
        }
        .product-button-strip img {
          object-fit: contain;
          padding: 8%;
          transition: transform 180ms ease;
        }
        .product-button-strip a:hover img {
          transform: scale(1.035);
        }
        .product-button-strip .strip-image-empty {
          width: 100%;
          aspect-ratio: 4 / 5;
          background: #f1f1ef;
          box-shadow: 0 2px 9px rgba(0, 0, 0, .10);
          transition: box-shadow 180ms ease;
        }
        .product-button-strip a:hover .strip-image,
        .product-button-strip a:hover .strip-image-empty {
          box-shadow: 0 5px 15px rgba(0, 0, 0, .16);
        }
        .product-button-strip .strip-title {
          font: 600 .7rem/1.4 var(--font-mono), monospace;
          text-transform: uppercase;
          text-align: center;
          overflow-wrap: anywhere;
        }
        @media (max-width: 600px) {
          .product-button-strip { gap: .75rem; padding-inline: .75rem; }
          .product-button-strip a { flex-basis: 36vw; }
        }
      `}</style>
      {featured.map((product, index) => (
        <Link
          href={`/product/${product.slug}`}
          aria-label={`View ${product.name}`}
          key={`${product.slug}-${index}`}
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
    </section>
  );
}
