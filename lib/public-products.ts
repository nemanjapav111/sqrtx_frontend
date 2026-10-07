// The public list of a business's products, one page at a time (GET /product/summary, see API.md in the backend). Used by the
// server (the first page, lib/public-site.ts) and by the browser (search, category and "Show more": lib below), so it holds
// nothing that only works on one of them.

// How many products a page holds. 24 is a whole number of rows for one, two and three columns.
export const PUBLIC_PAGE_SIZE = 24;

// What a card of the list shows, and nothing more (no description, only the main photo): see the API notes.
export interface PublicProductCard {
  id: string;
  product_name: string;
  price: number | string | null; // a Postgres numeric: reads may come back as a string
  category: string;
  image: { card: { avif: string; webp: string }; card3x?: { avif: string }; placeholder: string | null } | null;
}

export interface PublicProductsPage {
  items: PublicProductCard[];
  total: number; // everything that matches the search and category, not only this page
  page: number;
  limit: number;
  categories: string[]; // all the business's categories, whatever the search
}

export const emptyProductsPage: PublicProductsPage = { items: [], total: 0, page: 1, limit: PUBLIC_PAGE_SIZE, categories: [] };

/** The query string of the API call. */
export function productsPageQuery(userId: string, { q = "", category = "", page = 1 }: { q?: string; category?: string; page?: number }) {
  const params = new URLSearchParams({ user_id: userId, page: String(page), limit: String(PUBLIC_PAGE_SIZE) });
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  return params.toString();
}

/** One page of a business's products, asked for from the browser (public: no login). Throws if the API can't answer. */
export async function fetchProductsPage(
  userId: string,
  options: { q?: string; category?: string; page?: number },
  signal?: AbortSignal,
): Promise<PublicProductsPage> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/product/summary?${productsPageQuery(userId, options)}`, { signal });
  if (!response.ok) throw new Error(`The API answered ${response.status}`);
  return (await response.json()) as PublicProductsPage;
}
