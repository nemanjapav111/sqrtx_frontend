import CompanyInfo, { VisitLink } from "@/app/home/company-info";
import type { PublicBusiness } from "@/lib/public-site";

// Whose product (or service) this is, on its page in the marketplace (Figma "company info and visit btn"): the business's logo, name, kind of
// business and place and a "Visit" button to its own page (home/company-info.tsx, shared with the Companies page).
export default function CompanyCard({ business, slug, categoryName }: { business: PublicBusiness; slug: string; categoryName: string | null }) {
  return (
    <div className="flex max-w-full flex-col gap-0.75">
      <CompanyInfo slug={slug} name={business.company_name} typeName={categoryName} city={business.city} logo={business.logo} className="pb-1.5" />
      <VisitLink slug={slug} />
    </div>
  );
}
