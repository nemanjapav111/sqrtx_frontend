import type { Metadata } from "next";
import { getHomeView } from "@/lib/home-view";
import HomeFeed from "../home/home-feed";

export const metadata: Metadata = {
  title: "sqrtx",
  description: "Find products from businesses near you.",
};

// sqrtx.co: the products of all the businesses, newest first (Figma "sqrtx Phone new", "sqrtx Tablet new", "sqrtx Desktop new", 2167). The
// shell (the black top bar, the bottom bar, the search and country the two share) is the layout next to this file; the list is home/home-feed.tsx.
// Drawn for the visitor's country (lib/home-view.ts). That reads a cookie and a header, so the page is made for each visit; what costs
// anything, the API's answer, is kept for 60 seconds for each country (lib/public-site.ts), so that is cheap.
export default async function Home() {
  const { country, initial } = await getHomeView();
  return <HomeFeed initial={initial} initialCountry={country} />;
}
