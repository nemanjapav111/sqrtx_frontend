import type { MetadataRoute } from "next";
import { SITE_ORIGIN, getSitemapCount, getSitemapPage } from "@/lib/public-site";
import { productPath } from "@/lib/product-url";

// The sitemap: the list of addresses a search engine should visit. Without it a crawler finds only what it can reach by
// clicking, and the products beyond a business's first 24 (which the page loads by "Show more") have no link it could follow.
// Each file lists the products of one page of the API's list (lib/public-site.ts says how many), each product's page and its
// business's page; the fixed pages of the site are in the first file. The files are /sitemap/0.xml, /sitemap/1.xml, ...
// and app/robots.ts names them all. Built when a crawler asks (the API's answer is kept for an hour), not while the site is built,
// so building the site needs no API.
export const dynamic = "force-dynamic";

export async function generateSitemaps() {
  return Array.from({ length: await getSitemapCount() }, (_, id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  const { items } = await getSitemapPage(id + 1);

  // A business's page: the last time any of its products in this file changed.
  const businesses = new Map<string, string>();
  for (const { slug, updated_at } of items) {
    const before = businesses.get(slug);
    if (!before || updated_at > before) businesses.set(slug, updated_at);
  }

  return [
    ...(id === 0
      ? [SITE_ORIGIN, `${SITE_ORIGIN}/privacy`, `${SITE_ORIGIN}/terms`].map((url) => ({ url }))
      : []),
    ...[...businesses].map(([slug, lastModified]) => ({ url: `${SITE_ORIGIN}/${slug}`, lastModified })),
    // The one address of each product (its name and id), never the bare id, which would only redirect there.
    ...items.map((product) => ({ url: `${SITE_ORIGIN}${productPath(product.slug, product)}`, lastModified: product.updated_at })),
  ];
}
