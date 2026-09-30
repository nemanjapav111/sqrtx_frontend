import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBusiness, getProduct } from "@/lib/public-site";
import ProductDetail from "./product-detail";

// A product's own page: sqrtx.co/<address>/product/<id>. The layout next to the list (../../layout.tsx) draws the top and
// bottom bars and 404s a business that isn't public; this 404s a product that isn't shown to the public (the API says
// so: its owner's registration isn't finished, the trial is over, the business no longer offers products) or that
// belongs to another business than the address says.
// Cacheable: no address is built ahead of time (an empty list), but each one is built on its FIRST visit and the finished
// page is then kept and handed to every visitor (and to a CDN in front of the site) until it is renewed: after a minute (the
// API answers it is built from are kept for 60 seconds, see lib/public-site.ts) or as soon as its owner saves something
// (lib/refresh-public-page.ts clears the answers' labels, and with them this page). Without this the page was rendered again for every
// single visit and sent "private, no-cache", which no CDN may keep.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id } = await params;
  const business = await getBusiness(slug);
  if (!business) return {};
  const product = await getProduct(id, business.user_id);
  if (!product || product.user_id !== business.user_id) return {};
  return { title: `${product.product_name} – ${business.company_name}`, description: product.description.slice(0, 160) };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const business = await getBusiness(slug);
  if (!business) notFound();
  const product = await getProduct(id, business.user_id);
  if (!product || product.user_id !== business.user_id) notFound();
  return <ProductDetail product={product} business={business} slug={slug.toLowerCase()} />;
}
