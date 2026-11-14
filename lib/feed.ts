// The home page's list: the products of ALL the businesses, newest first, one page at a time (GET /feed/products, see API.md in the
// backend). Used by the server (the first page, lib/public-site.ts) and by the browser (search, filters and "Show more"), so it holds
// nothing that only works on one of them.
import { shrinkForSearch } from "@/lib/photos";
import type { ServicePriceType } from "@/lib/price";
import { usStateCode } from "@/lib/us-states";

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
  currency: string; // what the price is in (the business's currency, ISO 4217)
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
  currency: string; // what the price is in (the business's currency, ISO 4217)
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

// What a list asks for: the words searched, the business category, the country and, inside it, the city (all optional), and the page.
export interface FeedOptions {
  q?: string;
  category?: string;
  country?: string;
  city?: string;
  photoToken?: string; // a search BY PHOTO (see uploadSearchPhoto); with `q` the words put the items that look like the photo in order (photo + words)
  page?: number;
}

/** The API answered with an error status; `status` says which (410: the photo search has expired, 503: it cannot answer, 429: too many photos). */
export class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`The API answered ${status}`);
  }
}

/** The query string of the API call. */
export function feedQuery({ q = "", category = "", country = "", city = "", photoToken = "", page = 1 }: FeedOptions) {
  const params = new URLSearchParams({ page: String(page), limit: String(FEED_PAGE_SIZE) });
  if (photoToken) params.set("photo_token", photoToken);
  if (q) params.set("q", q);
  if (category) params.set("business_category", category);
  if (country) params.set("country", country);
  if (country && city) {
    // a city belongs to its country: without one it is not sent. A US city also carries its state (see cityValue).
    const place = splitCityValue(city);
    params.set("city", place.city);
    if (place.state) params.set("state", place.state);
  }
  return params.toString();
}

// The location picker's list of cities (GET /feed/cities): the cities of one country that have something to show, with how many items each has
// (products, services or businesses, by the page the visitor is on), the busiest first. `state` is the state as the owner saved it ("Texas"),
// only for the United States, where "Austin, TX" and "Austin, MN" are two cities; null everywhere else.
export interface FeedCity {
  name: string;
  state?: string | null;
  count: number;
}

// The chosen city is ONE string all over the home page (the context, the lists' keys, the query). For a US city with a state it is "Austin" and
// "Texas" joined with a separator that no place name holds; feedQuery splits it again, and cityLabel makes the text for the screen ("Austin, TX").
const CITY_STATE_SEPARATOR = "\u001f";

export function cityValue({ name, state }: Pick<FeedCity, "name" | "state">): string {
  return state ? `${name}${CITY_STATE_SEPARATOR}${state}` : name;
}

export function splitCityValue(value: string): { city: string; state: string } {
  const [city, state = ""] = value.split(CITY_STATE_SEPARATOR);
  return { city, state };
}

/** The text of a city for the screen: "Austin, TX" for a US city with a state, the plain name otherwise. */
export function cityLabel(value: string): string {
  const { city, state } = splitCityValue(value);
  return state ? `${city}, ${usStateCode(state)}` : city;
}

/** Whether a picker row is the chosen city (letter case does not matter, as in the API's filter). */
export function isChosenCity(option: Pick<FeedCity, "name" | "state">, chosen: string): boolean {
  return cityValue(option).toLowerCase() === chosen.toLowerCase();
}

/** Whether what the visitor typed in "Find a city" matches a row: the city's name, or its state (written out or as a code). */
export function cityMatchesSearch(option: Pick<FeedCity, "name" | "state">, words: string): boolean {
  if (!words) return true;
  const needle = words.toLowerCase();
  if (option.name.toLowerCase().includes(needle)) return true;
  if (!option.state) return false;
  return option.state.toLowerCase().includes(needle) || usStateCode(option.state).toLowerCase() === needle;
}
export type FeedKind = "products" | "services" | "companies";

/**
 * The first step of a search by photo (POST /feed/photo in the API notes): the picture, shrunk to 512 px, goes up once and the answer is a token that the
 * lists ask the pages of the answer with (`photoToken`), good for 15 minutes. Throws ApiError (400 not a picture, 429 too many, 503 not available).
 */
export async function uploadSearchPhoto(file: File, signal?: AbortSignal): Promise<string> {
  const body = new FormData();
  body.append("photo", await shrinkForSearch(file));
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/feed/photo`, { method: "POST", body, signal });
  if (!response.ok) throw new ApiError(response.status);
  return ((await response.json()) as { photo_token: string }).photo_token;
}

/** The cities of a country for the picker, asked for from the browser (public: no login). Throws if the API can't answer. */
export async function fetchFeedCities(kind: FeedKind, country: string, signal?: AbortSignal): Promise<FeedCity[]> {
  const params = new URLSearchParams({ kind, country });
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/feed/cities?${params.toString()}`, { signal });
  if (!response.ok) throw new ApiError(response.status);
  return ((await response.json()) as { cities: FeedCity[] }).cities;
}

/** One page of the feed, asked for from the browser (public: no login). Throws if the API can't answer. */
export async function fetchFeedPage(
  options: FeedOptions,
  signal?: AbortSignal,
): Promise<FeedPage> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/feed/products?${feedQuery(options)}`, { signal });
  if (!response.ok) throw new ApiError(response.status);
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
  options: FeedOptions,
  signal?: AbortSignal,
): Promise<FeedServicesPage> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/feed/services?${feedQuery(options)}`, { signal });
  if (!response.ok) throw new ApiError(response.status);
  return (await response.json()) as FeedServicesPage;
}

export const emptyFeedCompaniesPage: FeedCompaniesPage = { items: [], has_more: false, page: 1, limit: FEED_PAGE_SIZE, categories: [], countries: [] };

/** One page of the companies feed, asked for from the browser (public: no login). Throws if the API can't answer. */
export async function fetchFeedCompaniesPage(
  options: FeedOptions,
  signal?: AbortSignal,
): Promise<FeedCompaniesPage> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/feed/companies?${feedQuery(options)}`, { signal });
  if (!response.ok) throw new ApiError(response.status);
  return (await response.json()) as FeedCompaniesPage;
}

// The country's name from its code: lib/i18n.ts (the same function serves the business pages).
export { countryName } from "@/lib/i18n";

/** What the cookie says: a country's code, "" for all countries, or null when the visitor has not chosen. */
export function countryFromCookie(value: string | undefined): string | null {
  if (value === "all") return ALL_COUNTRIES;
  return value && /^[A-Za-z]{2}$/.test(value) ? value.toUpperCase() : null;
}

/** The country a connection comes from, as the CDN in front of the site says it (Cloudflare's CF-IPCountry); null when it doesn't know. */
export function countryFromConnection(header: string | null): string | null {
  return header && /^[A-Za-z]{2}$/.test(header) && !["XX", "T1"].includes(header.toUpperCase()) ? header.toUpperCase() : null;
}
