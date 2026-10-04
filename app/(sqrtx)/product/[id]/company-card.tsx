import CompanyInfo from "@/app/home/company-info";
import type { PublicBusiness } from "@/lib/public-site";

// Whose product (or service) this is, on its page in the marketplace: the business's company block as one tappable card (logo, name, kind of
// business and place, a chevron) to its own page (home/company-info.tsx, shared with the Companies page). There is no "Visit" button and no
// "Sold by" / "Offered by" caption (the owner took it out, 2026-10-03): the card is the button.
export default function CompanyCard({ business, slug, categoryName }: { business: PublicBusiness; slug: string; categoryName: string | null }) {
  return <CompanyInfo card slug={slug} name={business.company_name} typeName={categoryName} city={business.city} logo={business.logo} />;
}
