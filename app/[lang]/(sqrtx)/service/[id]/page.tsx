import type { Metadata } from "next";
import { idFromSegment, serviceSegment, slugOfCompanyUrl } from "@/lib/product-url";
import { SITE_ORIGIN, getBusinessByUserId, getServiceAnywhere } from "@/lib/public-site";
import { MarketService } from "./market-service";

// A service's own page in the sqrtx marketplace: sqrtx.co/service/<name>-<id>, where a row of the Services page leads ("See More"). The
// services' version of the marketplace's product page (../../product/[id]/page.tsx: the same page and rules, the same layout, see
// item-detail/item-detail.tsx): the business's own page for the service is the canonical one.
// Pre-built like a business's own pages: no address is built ahead of time, each on its first visit, and the page is then kept until it is renewed (after a minute, or as soon as an owner saves something: lib/refresh-public-page.ts).
// Nothing in it depends on the visitor's country (the shell asks the browser for that: home/home-context.tsx), so it is the same for everyone.
export function generateStaticParams() {
  return [];
}

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

export default async function MarketServicePage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  return <MarketService lang={lang} segment={id} />;
}
