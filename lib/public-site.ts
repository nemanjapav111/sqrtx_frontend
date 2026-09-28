import { cache } from "react";

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
  // width and height: pixels of these files. null only for a logo saved before the API kept them.
  logo: { avif: string; webp: string; width: number | null; height: number | null } | null;
}

// One image of a product; `urls.card` is the size for the product card (fits inside 604 x 604, shown at 302 x 302).
export interface PublicProductImage {
  id: string;
  is_primary: boolean;
  sort_order: number;
  urls: { card: { avif: string; webp: string } };
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
async function getJson<T>(path: string, revalidate: number): Promise<T | null> {
  if (!API_URL) throw new Error("Missing NEXT_PUBLIC_API_URL (see .env.local).");
  const response = await fetch(`${API_URL}${path}`, { next: { revalidate } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`The API answered ${response.status} for ${path}`);
  return (await response.json()) as T;
}

// An address that could never belong to a business (see the company URL rules in the API): no need to ask.
export const isPossibleSlug = (slug: string) => /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug);

// cache(): the layout and the page both ask for the same business in one request, and only one call is made.
export const getBusiness = cache((slug: string) =>
  isPossibleSlug(slug.toLowerCase())
    ? getJson<PublicBusiness>(`/business-profile/by-url/${encodeURIComponent(slug)}`, 60)
    : Promise.resolve(null),
);

export const getProducts = cache(async (userId: string) => (await getJson<PublicProduct[]>(`/product?user_id=${userId}`, 60)) ?? []);

/** The name of a business category from its id ("supplements" -> "Vitamins & supplements"), or null if unknown. */
export const getCategoryName = cache(async (id: string) => {
  const categories = await getJson<{ id: string; name: string }[]>("/business-profile/categories", 300);
  return categories?.find((c) => c.id === id)?.name ?? null;
});
