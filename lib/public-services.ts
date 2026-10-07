// The public list of a business's services, one page at a time (GET /service/summary, see API.md in the backend): the services' version
// of lib/public-products.ts. Used by the server (the first page, lib/public-site.ts) and by the browser (search, category and
// "Show more"), so it holds nothing that only works on one of them.
import type { ServicePriceType } from "@/lib/price";

// How many services a page holds. (A row is large, so this is a lot of scrolling already; 24 matches the products' page size.)
export const PUBLIC_SERVICES_PAGE_SIZE = 24;

// What a row of the list shows, and nothing more: the first part of the description (cut by the API, `description_cut` says it was
// longer) and the main photo in the list size (fits inside 1000 x 750; the row shows it whole in a framed box), see the API notes.
export interface PublicServiceRow {
  id: string;
  service_name: string;
  price: number | string | null; // a Postgres numeric: reads may come back as a string
  price_type: ServicePriceType; // what the price means: exact, from, per hour, per visit
  category: string;
  description: string;
  description_cut: boolean;
  image: { detail: { avif: string; webp: string }; detail3x?: { avif: string }; placeholder: string | null } | null;
}

export interface PublicServicesPage {
  items: PublicServiceRow[];
  total: number; // everything that matches the search and category, not only this page
  page: number;
  limit: number;
  categories: string[]; // all the business's categories, whatever the search
}

export const emptyServicesPage: PublicServicesPage = { items: [], total: 0, page: 1, limit: PUBLIC_SERVICES_PAGE_SIZE, categories: [] };

/** The query string of the API call. */
export function servicesPageQuery(userId: string, { q = "", category = "", page = 1 }: { q?: string; category?: string; page?: number }) {
  const params = new URLSearchParams({ user_id: userId, page: String(page), limit: String(PUBLIC_SERVICES_PAGE_SIZE) });
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  return params.toString();
}

/** One page of a business's services, asked for from the browser (public: no login). Throws if the API can't answer. */
export async function fetchServicesPage(
  userId: string,
  options: { q?: string; category?: string; page?: number },
  signal?: AbortSignal,
): Promise<PublicServicesPage> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/service/summary?${servicesPageQuery(userId, options)}`, { signal });
  if (!response.ok) throw new Error(`The API answered ${response.status}`);
  return (await response.json()) as PublicServicesPage;
}
