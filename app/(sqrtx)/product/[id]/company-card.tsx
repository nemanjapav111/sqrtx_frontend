import CompanyInfo from "@/app/home/company-info";
import type { PublicBusiness } from "@/lib/public-site";

// Whose product (or service) this is, on its page in the marketplace: a small caption ("Sold by" / "Offered by") and under it the business's
// company block as one tappable card (logo, name, kind of business and place, a chevron) to its own page (home/company-info.tsx, shared with the
// Companies page). There is no separate "Visit" button: the card is the button.
export default function CompanyCard({
  business,
  slug,
  categoryName,
  label,
}: {
  business: PublicBusiness;
  slug: string;
  categoryName: string | null;
  label: string;
}) {
  return (
    <div className="flex max-w-full flex-col gap-2.5">
      <p className="text-[13px] leading-4 font-medium text-[#636363]">{label}</p>
      <CompanyInfo card slug={slug} name={business.company_name} typeName={categoryName} city={business.city} logo={business.logo} />
    </div>
  );
}
