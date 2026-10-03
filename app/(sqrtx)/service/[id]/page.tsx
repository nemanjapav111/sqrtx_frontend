import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import ItemDetail from "@/app/[slug]/item-detail/item-detail";
import { idFromSegment, serviceSegment, slugOfCompanyUrl } from "@/lib/product-url";
import { SITE_ORIGIN, getBusinessByUserId, getCategoryName, getServiceAnywhere } from "@/lib/public-site";
import CompanyCard from "../../product/[id]/company-card";

// A service's own page in the sqrtx marketplace: sqrtx.co/service/<name>-<id>, where a row of the Services page leads ("See More"). The
// services' version of the marketplace's product page (../../product/[id]/page.tsx: the same page and rules, the same layout, see
// item-detail/item-detail.tsx): the business's own page for the service is the canonical one.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = idFromSegment((await params).id);
  if (!id) return {};
  const service = await getServiceAnywhere(id);
  if (!service) return {};
  const business = await getBusinessByUserId(service.user_id);
  const slug = business && slugOfCompanyUrl(business.company_url);
  if (!business || !slug) return {};
  return {
    title: `${service.service_name} – ${business.company_name}`,
    description: service.description.slice(0, 160),
    alternates: { canonical: `${SITE_ORIGIN}/${slug}/service/${serviceSegment(service.service_name, service.id)}` },
  };
}

export default async function MarketServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: segment } = await params;
  const id = idFromSegment(segment);
  if (!id) notFound();
  const service = await getServiceAnywhere(id);
  if (!service) notFound();
  const business = await getBusinessByUserId(service.user_id);
  const slug = business && slugOfCompanyUrl(business.company_url);
  if (!business || !slug) notFound();
  const current = serviceSegment(service.service_name, service.id);
  if (segment !== current) permanentRedirect(`/service/${current}`);

  const categoryName = await getCategoryName(business.business_category);
  const item = {
    name: service.service_name,
    price: service.price,
    priceType: service.price_type,
    description: service.description,
    images: service.images,
    service: { duration: service.duration, area: service.service_area },
  };
  return (
    <ItemDetail
      item={item}
      business={business}
      slug={slug}
      backTo="/services"
      backLabel="Back to services"
      company={<CompanyCard business={business} slug={slug} categoryName={categoryName} label="Offered by" />}
    />
  );
}
