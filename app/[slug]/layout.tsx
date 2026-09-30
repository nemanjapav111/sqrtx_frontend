import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getBusiness, getCategoryName } from "@/lib/public-site";
import BusinessFooter from "./business-footer";
import BusinessHeader from "./business-header";
import PathTracker from "./path-tracker";
import { SearchProvider } from "./search-context";

// The shell of a business's public site (sqrtx.co/<address>): the top bar with the logo and name, and, on a phone, the
// bottom bar with the pages (Products, Services, Contact, About) and the way back to sqrtx (on tablet and desktop those
// links are in the top bar). Designed for phone, tablet and desktop (Figma 2063:8869, 1957:532, 1424:452). Only the
// Products page (page.tsx) is designed and built so far: Services, Contact and About do not exist yet.
// A business the API does not show (unknown address, registration not finished, trial or subscription ended) is a 404.
// Cacheable: no address is built ahead of time (an empty list), but each one is built on its FIRST visit and the finished
// page is then kept and handed to every visitor (and to a CDN in front of the site) until it is renewed: after a minute (the
// API answers it is built from are kept for 60 seconds, see lib/public-site.ts) or as soon as its owner saves something
// (lib/refresh-public-page.ts clears the answers' labels, and with them this page). Without this the page was rendered again for every
// single visit and sent "private, no-cache", which no CDN may keep.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) return {};
  return {
    title: `${business.company_name} – sqrtx`,
    description: business.about_company?.slice(0, 160) ?? undefined,
  };
}

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Addresses are lowercase: sqrtx.co/Vega is the same page as sqrtx.co/vega, so it goes to the one address.
  if (slug !== slug.toLowerCase()) permanentRedirect(`/${slug.toLowerCase()}`);

  const business = await getBusiness(slug);
  if (!business) notFound();
  const categoryName = await getCategoryName(business.business_category);

  return (
    <SearchProvider>
      <PathTracker />
      <div className="flex min-h-dvh flex-col bg-white leading-[normal] text-black">
        <BusinessHeader business={business} slug={slug} categoryName={categoryName} />
        {/* pb: on a phone, room for the fixed bottom bar (44px + its 1px top line, plus the phone's own bottom edge
            where it has one). Tablet and desktop have no bottom bar. */}
        <div className="flex flex-1 flex-col pb-[calc(45px+env(safe-area-inset-bottom))] md:pb-0">{children}</div>
        <BusinessFooter slug={slug} provides={business.provides} />
      </div>
    </SearchProvider>
  );
}
