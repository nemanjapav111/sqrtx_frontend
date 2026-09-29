import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBusiness, getProduct } from "@/lib/public-site";
import ProductDetail from "./product-detail";

// A product's own page: sqrtx.co/<address>/product/<id>. The layout next to the list (../../layout.tsx) draws the top and
// bottom bars and 404s a business that isn't public; this 404s a product that isn't shown to the public (the API says
// so: its owner's registration isn't finished, the trial is over, the business no longer offers products) or that
// belongs to another business than the address says.
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
