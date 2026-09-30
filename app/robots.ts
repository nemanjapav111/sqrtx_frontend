import type { MetadataRoute } from "next";
import { SITE_ORIGIN, getSitemapCount } from "@/lib/public-site";

// What crawlers may visit: the public pages. The owner's pages and the sign-in and registration forms have nothing for a
// search engine, so they are asked to stay out (this only asks: a page still has to keep itself private, and these do by needing a login).
// "$" ends an address: a rule "/login" alone would also shut out a business whose address starts with it (sqrtx.co/login-shoes).
// And where the sitemap files are (app/sitemap.ts).
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const files = await getSitemapCount();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/account$", "/account/", "/login$", "/register$", "/register/", "/forgot-password$", "/reset-password$"] },
    sitemap: Array.from({ length: files }, (_, id) => `${SITE_ORIGIN}/sitemap/${id}.xml`),
  };
}
