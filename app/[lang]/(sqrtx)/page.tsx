import type { Metadata } from "next";
import { getHomeView } from "@/lib/home-view";
import { asLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import HomeFeed from "../home/home-feed";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { home } = await getDictionary(asLocale((await params).lang));
  return { title: home.metaTitle, description: home.metaDescription };
}

// sqrtx.co: the products of all the businesses, newest first (Figma "sqrtx Phone new", "sqrtx Tablet new", "sqrtx Desktop new", 2167). The
// shell (the black top bar, the bottom bar, the search and country the two share) is the layout next to this file; the list is home/home-feed.tsx.
// Drawn for the visitor's country (lib/home-view.ts). That reads a cookie and a header, so the page is made for each visit; what costs
// anything, the API's answer, is kept for 60 seconds for each country (lib/public-site.ts), so that is cheap.
export default async function Home() {
  const { country, initial } = await getHomeView();
  return <HomeFeed initial={initial} initialCountry={country} />;
}
