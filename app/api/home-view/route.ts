import { getHomeView } from "@/lib/home-view";

// The visitor's country (the one they chose, else the one their connection comes from) and the countries the location picker lists. The marketplace's
// shell (app/[lang]/(sqrtx)/layout.tsx) knows neither: it must not read the cookie or the connection's header, or every page in it (a product's page too)
// would be drawn again for every visit. The shell asks for them from the browser instead, once per visit (home/home-context.tsx).
export async function GET() {
  const { country, initial } = await getHomeView();
  return Response.json({ country, countries: initial.countries ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
