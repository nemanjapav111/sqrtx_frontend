import type { Metadata } from "next";
import { getHomeView } from "@/lib/home-view";
import { asLocale } from "@/lib/i18n";
import { getFeedCompaniesPage } from "@/lib/public-site";
import { getDictionary } from "../../dictionaries";
import HomeCompanies from "../../home/home-companies";

export async function generateMetadata({ params }: PageProps<"/[lang]/companies">): Promise<Metadata> {
  const { companies } = (await getDictionary(asLocale((await params).lang))).home;
  return { title: companies.metaTitle, description: companies.metaDescription };
}

// sqrtx.co/companies: the businesses, newest first (Figma "sqrtx Companies Phone/Tablet/Desktop new"). The shell (the black top bar, the bottom
// bar, the search and country the pages share) is the layout above (../layout.tsx); the list is home/home-companies.tsx. Drawn for the
// visitor's country, like the home page (lib/home-view.ts).
export default async function CompaniesPage() {
  const { country } = await getHomeView();
  const initial = await getFeedCompaniesPage(country);
  return <HomeCompanies initial={initial} initialCountry={country} />;
}
