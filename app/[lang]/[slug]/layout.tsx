import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { categoryNamer } from "@/lib/category-names";
import { loadCategoryTable } from "@/lib/category-tables";
import { asLocale, businessBase } from "@/lib/i18n";
import { getBusiness, getCategoryName } from "@/lib/public-site";
import BusinessFooter from "./business-footer";
import BusinessHeader from "./business-header";
import BusinessContent from "./business-content";
import LanguageOffer from "./language-offer";
import { getDictionary } from "../dictionaries";
import { SearchProvider } from "./search-context";
import ScrollTopOnTab from "./scroll-top-on-tab";

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

// (`modal` is only here to satisfy the generated type check of a layout that has a slot: Next.js passes the params only.)
export async function generateMetadata({ params }: { params: Promise<{ slug: string }>; modal: React.ReactNode }): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) return {};
  return {
    title: `${business.company_name} – sqrtx`,
    description: business.about_company?.slice(0, 160) ?? undefined,
  };
}

// `modal`: a product or a service opened from one of the lists is drawn above it (@modal/(.)product/[id], @modal/(.)service/[id]), and the list stays where it is.
export default async function BusinessLayout({
  children,
  modal,
  params,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang: langPart, slug } = await params;
  const lang = asLocale(langPart);
  // Addresses are lowercase: sqrtx.co/Vega is the same page as sqrtx.co/vega, so it goes to the one address.
  if (slug !== slug.toLowerCase()) permanentRedirect(businessBase(slug.toLowerCase(), lang));

  const business = await getBusiness(slug);
  if (!business) notFound();
  const categoryApiName = await getCategoryName(business.business_category);
  const categoryName = categoryApiName === null ? null : categoryNamer(await loadCategoryTable(lang)).name(business.business_category, categoryApiName);
  const { business: text } = await getDictionary(lang);

  return (
    <SearchProvider text={text}>
      <ScrollTopOnTab />
      <div className="flex min-h-dvh flex-col bg-white leading-[normal] text-black">
        <BusinessHeader business={business} slug={slug} lang={lang} categoryName={categoryName} backLabel={text.backToSqrtx} />
        {/* pb: on a phone, room for the fixed bottom bar (58px + its 1px top line, plus the phone's own bottom edge
            where it has one). Tablet and desktop have no bottom bar. */}
        <BusinessContent className="keep-width flex flex-1 flex-col pb-[calc(59px+env(safe-area-inset-bottom))] md:pb-0">{children}</BusinessContent>
        {modal}
        <BusinessFooter slug={slug} provides={business.provides} />
        <LanguageOffer />
      </div>
    </SearchProvider>
  );
}
