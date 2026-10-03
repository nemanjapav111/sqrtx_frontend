import type { MetadataRoute } from "next";
import { SITE_ORIGIN, getSitemapCount, getSitemapPage } from "@/lib/public-site";
import { productPath, servicePath } from "@/lib/product-url";

// The sitemap: the list of addresses a search engine should visit. Without it a crawler finds only what it can reach by clicking, and the
// products and services beyond a business's first 24 (which the page loads by "Show more") have no link it could follow.
// Each file lists one page of the API's list of businesses, products and services (lib/public-site.ts says how many files there are); the
// fixed pages of the site are in the first one. The files are /sitemap/0.xml, /sitemap/1.xml, ... and app/robots.ts names them all. Built
// when a crawler asks (the API's answer is kept for an hour), not while the site is built, so building the site needs no API.
//  - A business: its own page, its Contact and About pages, and its Services page when it offers both products and services (a business
//    that offers only services has them at its own address; one that offers only products has no Services page).
//  - A product or a service: its page under its business's address (its name and id, never the bare id, which would only redirect there).
//  - NOT the marketplace's own pages for a product or a service (/product/..., /service/...): they show the same thing as the business's page,
//    which they name as their canonical address, so listing them would only repeat it.
export const dynamic = "force-dynamic";

export async function generateSitemaps() {
  return Array.from({ length: await getSitemapCount() }, (_, id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  const { items } = await getSitemapPage(id + 1);

  const entries: MetadataRoute.Sitemap = items.flatMap((entry) => {
    const lastModified = entry.updated_at;
    const base = `${SITE_ORIGIN}/${entry.slug}`;
    if (entry.kind === "product") return [{ url: `${SITE_ORIGIN}${productPath(entry.slug, { id: entry.id, product_name: entry.name })}`, lastModified }];
    if (entry.kind === "service") return [{ url: `${SITE_ORIGIN}${servicePath(entry.slug, { id: entry.id, service_name: entry.name })}`, lastModified }];
    return [
      { url: base, lastModified },
      { url: `${base}/contact`, lastModified },
      { url: `${base}/about`, lastModified },
      ...(entry.provides === "both" ? [{ url: `${base}/services`, lastModified }] : []),
    ];
  });

  return [
    ...(id === 0
      ? [SITE_ORIGIN, `${SITE_ORIGIN}/services`, `${SITE_ORIGIN}/companies`, `${SITE_ORIGIN}/about`, `${SITE_ORIGIN}/privacy`, `${SITE_ORIGIN}/terms`].map((url) => ({ url }))
      : []),
    ...entries,
  ];
}
