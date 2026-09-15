import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { ProductPlaceholder } from "@/components/product-placeholder";
import { getProduct, products } from "@/data/products";
export function generateStaticParams() { return products.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const product = getProduct((await params).slug); return product ? { title: product.name, description: product.description } : {}; }
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) { const product = getProduct((await params).slug); if (!product) notFound(); return <main className="product-page"><ProductPlaceholder name={product.name} tone={product.imageTone} /><section className="product-info"><div><p className="eyebrow">{product.seller}</p><h1>{product.name}</h1><p>${product.price}</p></div><p className="description">{product.description}</p><dl><div><dt>COLOR</dt><dd>{product.color}</dd></div><div><dt>FULFILLMENT</dt><dd>BY SELLER</dd></div></dl><AddToCart product={product} /></section></main>; }
