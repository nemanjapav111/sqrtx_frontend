import type { Metadata } from "next";
import { idFromSegment, productSegment, slugOfCompanyUrl } from "@/lib/product-url";
import { SITE_ORIGIN, getBusinessByUserId, getProductAnywhere } from "@/lib/public-site";
import { MarketProduct } from "./market-product";

// A product's own page in the sqrtx marketplace: sqrtx.co/product/<name>-<id> (Figma "sqrtx Product Details Phone/Tablet/Desktop new"), where
// a product of the home page leads. The same page as the one under its business's own address (<address>/product/<name>-<id>,
// item-detail/item-detail.tsx), in the marketplace's top and bottom bars, with the business's logo, name, kind and place and a "Visit" button
// where the business's own page has its top bar. The address has no business in it: the id at the end finds the product, which says whose it is
// (a bare id, or an old name after a rename, is sent to the current address, as there). A product the API does not show to the public (its
// owner's registration isn't finished, the trial is over, the business no longer offers products) is a 404.
// Two addresses show one product, so the business's own is the one search engines are told about (canonical).
// Pre-built like a business's own pages: no address is built ahead of time, each on its first visit, and the page is then kept until it is renewed (after a minute, or as soon as an owner saves something: lib/refresh-public-page.ts).
// Nothing in it depends on the visitor's country (the shell asks the browser for that: home/home-context.tsx), so it is the same for everyone.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = idFromSegment((await params).id);
  if (!id) return {};
  const product = await getProductAnywhere(id);
  if (!product) return {};
  const business = await getBusinessByUserId(product.user_id);
  const slug = business && slugOfCompanyUrl(business.company_url);
  if (!business || !slug) return {};
  return {
    title: `${product.product_name} – ${business.company_name}`,
    description: product.description.slice(0, 160),
    alternates: { canonical: `${SITE_ORIGIN}/${slug}/product/${productSegment(product.product_name, product.id)}` },
  };
}

export default async function MarketProductPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  return <MarketProduct lang={lang} segment={id} />;
}
