import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/data/products";

const sampleProducts = [
  {
    name: "Studio Tee",
    image:
      "https://images.pexels.com/photos/6046205/pexels-photo-6046205.jpeg?auto=compress&dpr=1&h=750&w=1260",
  },
  {
    name: "Utility Daypack",
    image:
      "https://images.pexels.com/photos/27911168/pexels-photo-27911168/free-photo-of-bag.jpeg?auto=compress&dpr=1&h=750&w=1260",
  },
  {
    name: "Classic Runner",
    image:
      "https://images.pexels.com/photos/20298288/pexels-photo-20298288/free-photo-of-sneakers-on-white-background.png?auto=compress&dpr=1&h=750&w=1260",
  },
  {
    name: "Denim Layer",
    image:
      "https://images.pexels.com/photos/8099697/pexels-photo-8099697.jpeg?auto=compress&dpr=1&h=750&w=1260",
  },
  {
    name: "Core White Tee",
    image:
      "https://images.pexels.com/photos/18186106/pexels-photo-18186106/free-photo-of-a-basic-white-t-shirt.jpeg?auto=compress&dpr=1&h=750&w=1260",
  },
  {
    name: "Leather Boots",
    image:
      "https://images.pexels.com/photos/26851201/pexels-photo-26851201/free-photo-of-black-leather-boots.jpeg?auto=compress&dpr=1&h=750&w=1260",
  },
];

export function ProductButtonStrip({ products }: { products: Product[] }) {
  const hoodie = products.find((product) => product.name.toLowerCase().includes("black hoodie"));
  const jeans = products.find((product) => product.name.toLowerCase().includes("jeans"));
  const featured = hoodie && jeans
    ? [hoodie, jeans, hoodie, jeans, hoodie, jeans]
    : products.slice(0, 6);

  return (
    <section className="product-button-strip" aria-label="Featured products and style samples">
      <style>{`
        .product-button-strip {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
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
        .product-button-row .strip-note {
          display: block;
          margin-top: .15rem;
          font: 400 .58rem/1.4 var(--font-mono), monospace;
          letter-spacing: .04em;
          color: #696969;
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
      <div className="product-button-row" aria-label="Available products">
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
                  sizes="(max-width: 600px) 36vw, 14vw"
                />
              </span>
            ) : (
              <span className="strip-image-empty" aria-hidden="true" />
            )}
            <span className="strip-title">{product.name}</span>
          </Link>
        ))}
      </div>
      <div className="product-button-row" aria-label="Style samples, not available for purchase">
        {sampleProducts.map((product) => (
          <Link
            href="#new-arrivals"
            aria-label={`${product.name}, sample image; browse available products`}
            key={product.name}
          >
            <span className="strip-image">
              <img src={product.image} alt="" loading="lazy" />
            </span>
            <span className="strip-title">
              {product.name}
              <span className="strip-note">STYLE SAMPLE</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
