import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import ItemDetail from "@/app/[slug]/item-detail/item-detail";
import { idFromSegment, productSegment, slugOfCompanyUrl } from "@/lib/product-url";
import { SITE_ORIGIN, getBusinessByUserId, getCategoryName, getProductAnywhere } from "@/lib/public-site";
import CompanyCard from "./company-card";

// A product's own page in the sqrtx marketplace: sqrtx.co/product/<name>-<id> (Figma "sqrtx Product Details Phone/Tablet/Desktop new"), where
// a product of the home page leads. The same page as the one under its business's own address (<address>/product/<name>-<id>,
// item-detail/item-detail.tsx), in the marketplace's top and bottom bars, with the business's logo, name, kind and place and a "Visit" button
// where the business's own page has its top bar. The address has no business in it: the id at the end finds the product, which says whose it is
// (a bare id, or an old name after a rename, is sent to the current address, as there). A product the API does not show to the public (its
// owner's registration isn't finished, the trial is over, the business no longer offers products) is a 404.
// Two addresses show one product, so the business's own is the one search engines are told about (canonical).
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

export default async function MarketProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: segment } = await params;
  const id = idFromSegment(segment);
  if (!id) notFound();
  const product = await getProductAnywhere(id);
  if (!product) notFound();
  const business = await getBusinessByUserId(product.user_id); // 404 for a business the public can't see
  const slug = business && slugOfCompanyUrl(business.company_url);
  if (!business || !slug) notFound();
  const current = productSegment(product.product_name, product.id);
  if (segment !== current) permanentRedirect(`/product/${current}`);

  const categoryName = await getCategoryName(business.business_category);
  const item = { name: product.product_name, price: product.price, description: product.description, images: product.images };
  return (
    <ItemDetail
      item={item}
      business={business}
      slug={slug}
      backTo="/"
      backLabel="Back to products"
      company={<CompanyCard business={business} slug={slug} categoryName={categoryName} />}
    />
  );
}
