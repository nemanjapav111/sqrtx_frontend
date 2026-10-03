import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { idFromSegment, serviceSegment } from "@/lib/product-url";
import { SITE_ORIGIN, getBusiness, getService } from "@/lib/public-site";
import ItemDetail from "../../item-detail/item-detail";
import { tabPath } from "../../tabs";

// A service's own page: sqrtx.co/<address>/service/<name>-<id>, the "See More" of the services' list. The same page as a product's
// (item-detail/item-detail.tsx; the designs are the same) and the same address rules (lib/product-url.ts: the id at the end finds
// the service, the name is for people and search engines, any other form is sent to the current address, see product/[id]/page.tsx).
// The layout next to the list (../../layout.tsx) draws the top and bottom bars and 404s a business that isn't public; this 404s a
// service that isn't shown to the public (the API says so) or that belongs to another business than the address says.
// Cacheable like the product pages: built on the first visit, then kept (the API's answers for 60 seconds, or until the owner saves).
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id: segment } = await params;
  const id = idFromSegment(segment);
  if (!id) return {};
  const business = await getBusiness(slug);
  if (!business) return {};
  const service = await getService(id, business.user_id);
  if (!service || service.user_id !== business.user_id) return {};
  return {
    title: `${service.service_name} – ${business.company_name}`,
    description: service.description.slice(0, 160),
    // The service's one address, whichever form of it was asked for.
    alternates: { canonical: `${SITE_ORIGIN}/${slug.toLowerCase()}/service/${serviceSegment(service.service_name, service.id)}` },
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id: segment } = await params;
  const id = idFromSegment(segment);
  if (!id) notFound();
  const business = await getBusiness(slug);
  if (!business) notFound();
  const service = await getService(id, business.user_id);
  if (!service || service.user_id !== business.user_id) notFound();
  // Any other form of the address (the bare id, an old name, other capitals) goes to the current one.
  const current = serviceSegment(service.service_name, service.id);
  if (segment !== current) permanentRedirect(`/${slug.toLowerCase()}/service/${current}`);
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
      slug={slug.toLowerCase()}
      backTo={tabPath(slug, business.provides, "services")}
      backLabel="Back to services"
    />
  );
}
