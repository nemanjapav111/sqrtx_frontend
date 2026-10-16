import type { Metadata } from "next";
import { getHomeView } from "@/lib/home-view";
import { asLocale } from "@/lib/i18n";
import { getFeedServicesPage } from "@/lib/public-site";
import { getDictionary } from "../../dictionaries";
import HomeServices from "../../home/home-services";

export async function generateMetadata({ params }: PageProps<"/[lang]/services">): Promise<Metadata> {
  const { services } = (await getDictionary(asLocale((await params).lang))).home;
  return { title: services.metaTitle, description: services.metaDescription };
}

// sqrtx.co/services: the services of all the businesses, newest first (Figma "sqrtx Services Phone/Tablet/Desktop new"). The shell (the black
// top bar, the bottom bar, the search and country the pages share) is the layout above (../layout.tsx); the list is home/home-services.tsx.
// Drawn for the visitor's country, like the home page (lib/home-view.ts).
export default async function ServicesPage() {
  const { country } = await getHomeView();
  const initial = await getFeedServicesPage(country);
  return <HomeServices initial={initial} initialCountry={country} />;
}
