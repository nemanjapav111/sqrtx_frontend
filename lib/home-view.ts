import { cache } from "react";
import { cookies, headers } from "next/headers";
import { COUNTRY_COOKIE, countryFromConnection, countryFromCookie } from "@/lib/feed";
import { getFeedPage } from "@/lib/public-site";

// What the pages of the sqrtx marketplace (the home page and a product's page in it, app/(sqrtx)/) start from: the visitor's country and the
// first page of the feed for it (which also carries the list of countries for the picker). The country is the one the visitor chose (a
// cookie), otherwise the one their connection comes from (the CDN in front of the site says it, Cloudflare's CF-IPCountry), otherwise the
// US; if none of the businesses is in that country (or nothing is in it yet) it is all countries (""). cache(): the layout and the page both
// ask, and it is worked out once per request; the API's answer itself is kept for 60 seconds for each country (lib/public-site.ts).
export const getHomeView = cache(async () => {
  const [jar, requestHeaders] = await Promise.all([cookies(), headers()]);
  const wanted = countryFromCookie(jar.get(COUNTRY_COOKIE)?.value) ?? countryFromConnection(requestHeaders.get("cf-ipcountry")) ?? "US";

  let country = wanted;
  let initial = await getFeedPage(country);
  // A chosen "all" ("") is already all countries.
  if (country && !initial.countries?.includes(country)) {
    country = "";
    initial = await getFeedPage("");
  }
  return { country, initial };
});
