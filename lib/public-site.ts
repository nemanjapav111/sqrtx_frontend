import { cache } from "react";
import { emptyProductsPage, productsPageQuery, type PublicProductsPage } from "@/lib/public-products";

// Reading what visitors see (a business's public page), on the server. No login: these API routes are public. The
// pages that use this are server components, so it doesn't use lib/api.ts (that one belongs to the logged-in browser).
// The API's rules are in API.md in the backend ("What the public sees").

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// What GET /business-profile/by-url/:slug returns (only the parts the public page uses).
export interface PublicBusiness {
  user_id: string;
  company_name: string;
  business_category: string; // the id of a category, see getCategoryNames
  company_url: string;
  about_company: string | null;
  provides: "products" | "services" | "both";
  // How to reach the business (the "View Contact" button of a product page shows these). Only the email is required.
  contact_email: string;
  phone: string | null;
  hours: string | null;
  formatted_address: string;
  facebook_link: string | null;
  instagram_link: string | null;
  // width and height: pixels of these files. null only for a logo saved before the API kept them.
  // placeholder: a tiny WebP data URI that becomes the blurred preview, null for a logo saved before the API made them.
  logo: { avif: string; webp: string; width: number | null; height: number | null; placeholder: string | null } | null;
}

// One image of a product; `urls.card` is the size for the product card (fits inside 604 x 604, shown at 302 x 302),
// `urls.detail` the size for the product's own page (fits inside 1536 x 900), `urls.full` the one for the photo viewer (fits inside 1920 x 1920).
export interface PublicProductImage {
  id: string;
  is_primary: boolean;
  // A tiny WebP data URI that becomes the blurred preview; null for an image saved before the API made them.
  placeholder: string | null;
  sort_order: number;
  urls: { card: { avif: string; webp: string }; detail: { avif: string; webp: string }; full: { avif: string; webp: string } };
}

// What GET /product?user_id=... returns for each product. `price` can arrive as a string (a Postgres numeric) or null.
export interface PublicProduct {
  id: string;
  product_name: string;
  price: number | string | null;
  category: string;
  description: string;
  images: PublicProductImage[];
}

// Answers the JSON, `null` when the API says 404 (nothing there, or not public), and throws for any other problem
// so the page shows an error instead of pretending the business doesn't exist.
// `revalidate`: Next keeps the answer for this many seconds, so a busy page doesn't ask the API on every visit. It also
// bounds how long a page stays visible after a trial ends (the API hides it at once, the site catches up).
// `tags`: labels on the saved answer, so it can be thrown away on demand before the time is up (see
// lib/refresh-public-page.ts): the owner's own changes show at once, while visitors keep getting saved copies.
async function getJson<T>(path: string, revalidate: number, tags: string[] = []): Promise<T | null> {
  if (!API_URL) throw new Error("Missing NEXT_PUBLIC_API_URL (see .env.local).");
  const response = await fetch(`${API_URL}${path}`, { next: { revalidate, tags } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`The API answered ${response.status} for ${path}`);
  return (await response.json()) as T;
}

// The labels of the saved answers. An address is lowercase everywhere it is stored, so the label is too.
export const businessTag = (slug: string) => `business:${slug.toLowerCase()}`;
export const productsTag = (userId: string) => `products:${userId}`;

// An address that could never belong to a business (see the company URL rules in the API): no need to ask.
export const isPossibleSlug = (slug: string) => /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug);

// cache(): the layout and the page both ask for the same business in one request, and only one call is made.
export const getBusiness = cache((slug: string) =>
  isPossibleSlug(slug.toLowerCase())
    ? getJson<PublicBusiness>(`/business-profile/by-url/${encodeURIComponent(slug)}`, 60, [businessTag(slug)])
    : Promise.resolve(null),
);

// What GET /product/:id returns: a product with ALL its images, in order (the list has them too, each with the same sizes).
export interface PublicProductDetail extends PublicProduct {
  user_id: string;
}

// A product id is a UUID: anything else could never be found, so it isn't even asked for (the API would answer 400).
export const isProductId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// The FIRST page of the business's product list (24 cards, with the categories for the filter): what the public page is built
// from. The next pages, and any search or category, are asked for by the browser (lib/public-products.ts). Only what a card
// shows is sent, see GET /product/summary in the API notes. Nothing found (a hidden business) is an empty page.
export const getProductsPage = cache(
  async (userId: string) =>
    (await getJson<PublicProductsPage>(`/product/summary?${productsPageQuery(userId, {})}`, 60, [productsTag(userId)])) ?? emptyProductsPage,
);

// `userId`: the business the page is under (the caller must check the product really belongs to it). One small request for
// this one product (the product's own page needs its description and all its photos, which the light list doesn't have).
export const getProduct = cache((id: string, userId: string) =>
  isProductId(id) ? getJson<PublicProductDetail>(`/product/${id}`, 60, [productsTag(userId)]) : Promise.resolve(null),
);

/** The name of a business category from its id ("supplements" -> "Vitamins & supplements"), or null if unknown. */
export const getCategoryName = cache(async (id: string) => {
  const categories = await getJson<{ id: string; name: string }[]>("/business-profile/categories", 300);
  return categories?.find((c) => c.id === id)?.name ?? null;
});

// ---------- for search engines (app/sitemap.ts, app/robots.ts) ----------

// Where the site lives on the web: the addresses in the sitemap are complete ones.
export const SITE_ORIGIN = "https://sqrtx.co";

// How many products go into one sitemap file (the most the API gives in one page). A search engine takes at most 50,000
// addresses per file, and each product adds at most two (its page and its business's page), so 10,000 stays well under.
export const SITEMAP_PRODUCTS_PER_FILE = 10000;

// What GET /product/sitemap returns: every product the public can see, with the address of its business.
export interface SitemapPage {
  items: { id: string; product_name: string; slug: string; updated_at: string }[];
  total: number;
}

// One page of that list, kept for an hour: a new product reaches the sitemap within the hour, which is all a crawler needs.
export const getSitemapPage = async (page: number) =>
  (await getJson<SitemapPage>(`/product/sitemap?page=${page}&limit=${SITEMAP_PRODUCTS_PER_FILE}`, 3600)) ?? { items: [], total: 0 };

// How many sitemap files there are (at least one: the fixed pages of the site are in it).
export async function getSitemapCount() {
  const { total } = await getSitemapPage(1);
  return Math.max(1, Math.ceil(total / SITEMAP_PRODUCTS_PER_FILE));
}
