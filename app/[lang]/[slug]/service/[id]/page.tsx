import type { Metadata } from "next";
import { idFromSegment, serviceSegment } from "@/lib/product-url";
import { SITE_ORIGIN, getBusiness, getService } from "@/lib/public-site";
import { BusinessService } from "./business-service";
import { asLocale, businessBase } from "@/lib/i18n";

// A service's own page: sqrtx.co/<address>/service/<name>-<id>, the "See More" of the services' list. The same page as a product's
// (item-detail/item-detail.tsx; the designs are the same) and the same address rules (lib/product-url.ts: the id at the end finds
// the service, the name is for people and search engines, any other form is sent to the current address, see product/[id]/page.tsx).
// The layout next to the list (../../layout.tsx) draws the top and bottom bars and 404s a business that isn't public; this 404s a
// service that isn't shown to the public (the API says so) or that belongs to another business than the address says.
// Cacheable like the product pages: built on the first visit, then kept (the API's answers for 60 seconds, or until the owner saves).
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string; id: string }> }): Promise<Metadata> {
  const { lang: langPart, slug, id: segment } = await params;
  const lang = asLocale(langPart);
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
    alternates: { canonical: `${SITE_ORIGIN}${businessBase(slug.toLowerCase(), lang)}/service/${serviceSegment(service.service_name, service.id)}` },
  };
}

export default async function ServicePage({ params }: { params: Promise<{ lang: string; slug: string; id: string }> }) {
  const { lang, slug, id } = await params;
  return <BusinessService lang={lang} slug={slug} segment={id} />;
}
