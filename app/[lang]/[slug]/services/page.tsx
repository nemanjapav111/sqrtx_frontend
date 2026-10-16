import { notFound, permanentRedirect } from "next/navigation";
import { getBusiness, getServicesPage } from "@/lib/public-site";
import ServiceList from "../service-list";
import { asLocale, businessBase } from "@/lib/i18n";

// sqrtx.co/<address>/services: the business's services. A business that lists ONLY services has this page at its own address
// (see tabs.ts's primaryTab and page.tsx), so this address goes there instead of showing the same page twice. A business that
// lists only products has no services: the page says so (the API shows none, see GET /service/summary).
// Only the FIRST page is built here (and kept, see generateStaticParams in the layout); the list asks for the rest.
export default async function ServicesPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang: langPart, slug } = await params;
  const business = await getBusiness(slug);
  if (!business) notFound();
  if (business.provides === "services") permanentRedirect(businessBase(slug.toLowerCase(), asLocale(langPart)));

  const initial = await getServicesPage(business.user_id);
  return <ServiceList initial={initial} userId={business.user_id} slug={slug.toLowerCase()} currency={business.currency} />;
}
