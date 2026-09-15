export type Product = { slug: string; name: string; price: number; category: "men" | "women"; seller: string; color: string; imageTone: string; sizes: string[]; description: string };
export const products: Product[] = [
  { slug: "utility-jacket", name: "UTILITY JACKET", price: 180, category: "men", seller: "NORTH STANDARD", color: "BLACK", imageTone: "#d7d7d7", sizes: ["S", "M", "L", "XL"], description: "Structured cotton shell with an oversized fit and concealed front closure." },
  { slug: "column-bag", name: "COLUMN BAG", price: 95, category: "women", seller: "OBJECT / 01", color: "CHALK", imageTone: "#c8c8c8", sizes: ["ONE SIZE"], description: "A compact everyday carry with an adjustable strap and magnetic closure." },
  { slug: "studio-trouser", name: "STUDIO TROUSER", price: 120, category: "women", seller: "FORM WORKS", color: "GRAPHITE", imageTone: "#bebebe", sizes: ["XS", "S", "M", "L"], description: "Relaxed wide-leg trouser cut from a durable midweight woven fabric." },
  { slug: "field-runner", name: "FIELD RUNNER", price: 145, category: "men", seller: "ARCHIVE UNIT", color: "BONE", imageTone: "#dedede", sizes: ["7", "8", "9", "10", "11", "12"], description: "Low-profile mixed-material runner built for daily wear." },
  { slug: "soft-form-01", name: "SOFT FORM 01", price: 75, category: "women", seller: "COMMON MATTER", color: "BLACK", imageTone: "#d0d0d0", sizes: ["XS", "S", "M", "L", "XL"], description: "Double-layer stretch top with a close fit and clean neckline." },
  { slug: "daily-object", name: "DAILY OBJECT", price: 48, category: "men", seller: "PLAIN GOODS", color: "STEEL", imageTone: "#c2c2c2", sizes: ["ONE SIZE"], description: "A compact utility object designed for work and travel." },
];
export function getProduct(slug: string) { return products.find((product) => product.slug === slug); }
