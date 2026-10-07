// The home page's list: the products of ALL the businesses, newest first, one page at a time (GET /feed/products, see API.md in the
// backend). Used by the server (the first page, lib/public-site.ts) and by the browser (search, filters and "Show more"), so it holds
// nothing that only works on one of them.
import type { ServicePriceType } from "@/lib/price";

// How many products a page holds. 24 is a whole number of rows for one, two and three columns.
export const FEED_PAGE_SIZE = 24;

// The country the visitor chose, kept in a cookie (not only in the browser's storage) so the server can draw the page for it at once:
// a two-letter code, or "all" for "all countries". Nothing is stored until the visitor chooses.
export const COUNTRY_COOKIE = "sqrtx_country";
export const ALL_COUNTRIES = ""; // the value of "all countries" in the page's own state (the cookie says "all")

// A business's logo, as the Services and Companies pages' rows have it (the home page's cards do not show it).
export interface FeedLogo {
  avif: string;
  webp: string;
  width: number | null;
  height: number | null;
  placeholder: string | null;
}

export interface FeedItem {
  id: string;
  product_name: string;
  price: number | string | null; // a Postgres numeric: reads may come back as a string
  slug: string; // the business's address (sqrtx.co/<slug>)
  company_name: string;
  image: { card: { avif: string; webp: string }; card3x?: { avif: string }; placeholder: string | null } | null;
}

export interface FeedCategory {
  id: string;
  name: string;
}

export interface FeedPage {
  items: FeedItem[];
  has_more: boolean; // there is no total (see the API notes)
  page: number;
  limit: number;
  // On the first page of a SEARCH only (the API writes the search down): its id, to be sent back with a click (see reportSearchClick).
  search_id?: string;
  // On the first page only: for the two pickers.
  categories?: FeedCategory[]; // the business categories that have a product (in the chosen country)
  countries?: string[]; // the countries that have a product, two capital letters
}

// The Services page's list (GET /feed/services): the same, for services. A row has the business's kind of business (by name) and city
// for its company block, and the description cut by the API (`description_cut` says it was longer).
export interface FeedServiceItem {
  id: string;
  service_name: string;
  price: number | string | null;
  price_type: ServicePriceType; // what the price means: exact, from, per hour, per visit
  description: string;
  description_cut: boolean;
  slug: string;
  company_name: string;
  company_type: string | null;
  city: string;
  logo: FeedLogo | null;
  image: { detail: { avif: string; webp: string }; detail3x?: { avif: string }; placeholder: string | null } | null;
}
export interface FeedServicesPage extends Omit<FeedPage, "items"> {
  items: FeedServiceItem[];
}

// The Companies page's list (GET /feed/companies): the businesses, newest first. `about` is the first 500 characters of the About text (the page
// shows 5 lines of it).
export interface FeedCompanyItem {
  slug: string;
  company_name: string;
  company_type: string | null;
  city: string;
  about: string | null;
  logo: FeedLogo | null;
}
export interface FeedCompaniesPage extends Omit<FeedPage, "items"> {
  items: FeedCompanyItem[];
}

export const emptyFeedPage: FeedPage = { items: [], has_more: false, page: 1, limit: FEED_PAGE_SIZE, categories: [], countries: [] };

/** The query string of the API call. */
export function feedQuery({ q = "", category = "", country = "", page = 1 }: { q?: string; category?: string; country?: string; page?: number }) {
  const params = new URLSearchParams({ page: String(page), limit: String(FEED_PAGE_SIZE) });
  if (q) params.set("q", q);
  if (category) params.set("business_category", category);
  if (country) params.set("country", country);
  return params.toString();
}

/** One page of the feed, asked for from the browser (public: no login). Throws if the API can't answer. */
export async function fetchFeedPage(
  options: { q?: string; category?: string; country?: string; page?: number },
  signal?: AbortSignal,
): Promise<FeedPage> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/feed/products?${feedQuery(options)}`, { signal });
  if (!response.ok) throw new Error(`The API answered ${response.status}`);
  return (await response.json()) as FeedPage;
}

/**
 * The visitor opened a result of a search: tells the API which one (and at which place in the list, 0 = first), so the search can be judged on real
 * clicks. `searchId` is the one that came with the first page of that search; without it (no search, or the smart search is off) nothing is sent.
 * Fire and forget: it must never slow down or break the navigation (`keepalive` lets it finish while the next page loads).
 */
export function reportSearchClick(searchId: string | undefined, itemId: string, position: number) {
  if (!searchId) return;
  try {
    void fetch(`${process.env.NEXT_PUBLIC_API_URL}/feed/search-clicks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ search_id: searchId, item_id: itemId, position: Math.min(position, 500) }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // nothing to do: the click is only a statistic
  }
}

export const emptyFeedServicesPage: FeedServicesPage = { items: [], has_more: false, page: 1, limit: FEED_PAGE_SIZE, categories: [], countries: [] };

/** One page of the services feed, asked for from the browser (public: no login). Throws if the API can't answer. */
export async function fetchFeedServicesPage(
  options: { q?: string; category?: string; country?: string; page?: number },
  signal?: AbortSignal,
): Promise<FeedServicesPage> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/feed/services?${feedQuery(options)}`, { signal });
  if (!response.ok) throw new Error(`The API answered ${response.status}`);
  return (await response.json()) as FeedServicesPage;
}

export const emptyFeedCompaniesPage: FeedCompaniesPage = { items: [], has_more: false, page: 1, limit: FEED_PAGE_SIZE, categories: [], countries: [] };

/** One page of the companies feed, asked for from the browser (public: no login). Throws if the API can't answer. */
export async function fetchFeedCompaniesPage(
  options: { q?: string; category?: string; country?: string; page?: number },
  signal?: AbortSignal,
): Promise<FeedCompaniesPage> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/feed/companies?${feedQuery(options)}`, { signal });
  if (!response.ok) throw new Error(`The API answered ${response.status}`);
  return (await response.json()) as FeedCompaniesPage;
}

/** The country's name from its two-letter code ("US" -> "United States"); the code itself if the browser's list doesn't know it. */
export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** What the cookie says: a country's code, "" for all countries, or null when the visitor has not chosen. */
export function countryFromCookie(value: string | undefined): string | null {
  if (value === "all") return ALL_COUNTRIES;
  return value && /^[A-Za-z]{2}$/.test(value) ? value.toUpperCase() : null;
}

/** The country a connection comes from, as the CDN in front of the site says it (Cloudflare's CF-IPCountry); null when it doesn't know. */
export function countryFromConnection(header: string | null): string | null {
  return header && /^[A-Za-z]{2}$/.test(header) && !["XX", "T1"].includes(header.toUpperCase()) ? header.toUpperCase() : null;
}
