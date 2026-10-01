import type { Metadata } from "next";
import { getHomeView } from "@/lib/home-view";
import { getFeedServicesPage } from "@/lib/public-site";
import HomeServices from "../../home/home-services";

export const metadata: Metadata = {
  title: "Services – sqrtx",
  description: "Find services from businesses near you.",
};

// sqrtx.co/services: the services of all the businesses, newest first (Figma "sqrtx Services Phone/Tablet/Desktop new"). The shell (the black
// top bar, the bottom bar, the search and country the pages share) is the layout above (../layout.tsx); the list is home/home-services.tsx.
// Drawn for the visitor's country, like the home page (lib/home-view.ts).
export default async function ServicesPage() {
  const { country } = await getHomeView();
  const initial = await getFeedServicesPage(country);
  return <HomeServices initial={initial} initialCountry={country} />;
}
