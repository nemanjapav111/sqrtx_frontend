"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CategoryFilter from "@/app/[slug]/category-filter";
import PlaceholderPicture from "@/app/components/placeholder-picture";
import { fetchFeedPage, type FeedCategory, type FeedItem, type FeedPage } from "@/lib/feed";
import { LOGO_FIT_CLASS, logoDisplaySize } from "@/lib/logo";
import { formatPrice } from "@/lib/price";
import { marketProductPath } from "@/lib/product-url";
import { useHome } from "./home-context";

// The home page's list (Figma "sqrtx Phone new", 2167): the newest products of every business, the same cards as a business's own Products
// page (product-list.tsx: a grey box with the picture shown whole, the name, the price, 350px wide, wrapping into one, two or three
// columns) with the business's LOGO in the card's top-left corner (110 x 68, as in the design), and above the first row the filter ("ALL",
// 34px above): the business categories. Searching, the filter and the country (the bottom bar's picker) ask the API for the first page of
// what was chosen; the next pages come by "Show more" or by themselves when the end of the list is near. The API sends no total (it would
// count every product on every request), only whether there is a next page.
//
// A card leads to the product's own page in the marketplace (app/(sqrtx)/product/[id]), the logo to the business's page (a separate link beside the card's, not inside it: a link
// inside a link is not allowed). Not in the design, so placeholders: the words for an empty list or an error, and "Show more".

const ALL = "";
const SEARCH_DELAY_MS = 300;

// What is on screen: the products of ONE search + category + country (`key`), as many pages of them as were asked for.
interface View {
  key: string;
  items: FeedItem[];
  hasMore: boolean;
  page: number;
  categories: FeedCategory[]; // the business categories that have a product in this country
}
const keyOf = (q: string, category: string, country: string) => `${q}|${category}|${country}`;

export default function HomeFeed({ initial, initialCountry }: { initial: FeedPage; initialCountry: string }) {
  const { query, country } = useHome();
  // The chosen category belongs to the country it was chosen in: another country has other categories, so it starts again from "All".
  const [chosen, setChosen] = useState({ country: initialCountry, id: ALL });
  const category = chosen.country === country ? chosen.id : ALL;
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>({
    key: keyOf("", ALL, initialCountry),
    items: initial.items,
    hasMore: initial.has_more,
    page: 1,
    categories: initial.categories ?? [],
  });
  const [busy, setBusy] = useState(false); // a search / filter / country is being loaded
  const [moreBusy, setMoreBusy] = useState(false); // the next page is being loaded
  const [failed, setFailed] = useState(false);
  const latest = useRef(0); // only the newest request may change the screen

  // What is searched is what was typed, a moment after the typing stopped.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const key = keyOf(search, category, country);

  // A different search, category or country: its first page. The old products stay (a little faded) until the new ones are here.
  useEffect(() => {
    if (key === view.key) return;
    const id = ++latest.current;
    const controller = new AbortController();
    (async () => {
      setBusy(true);
      setFailed(false);
      try {
        const page = await fetchFeedPage({ q: search, category, country }, controller.signal);
        if (id === latest.current) setView({ key, items: page.items, hasMore: page.has_more, page: 1, categories: page.categories ?? [] });
      } catch {
        if (id === latest.current && !controller.signal.aborted) setFailed(true);
      } finally {
        if (id === latest.current) setBusy(false);
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- view.key is compared, not watched: this runs for a new search/category/country
  }, [key, search, category, country]);

  // The next page of what is on screen.
  const showMore = useCallback(async () => {
    if (moreBusy || busy || !view.hasMore) return;
    const id = ++latest.current;
    setMoreBusy(true);
    setFailed(false);
    try {
      const page = await fetchFeedPage({ q: search, category, country, page: view.page + 1 });
      if (id !== latest.current) return; // a newer search took over meanwhile
      setView((now) => {
        if (now.key !== view.key) return now;
        // A product added while the visitor scrolled shifts the pages by one: the same product is not shown twice.
        const have = new Set(now.items.map((p) => p.id));
        return { ...now, items: [...now.items, ...page.items.filter((p) => !have.has(p.id))], hasMore: page.has_more, page: view.page + 1 };
      });
    } catch {
      if (id === latest.current) setFailed(true);
    } finally {
      if (id === latest.current) setMoreBusy(false);
    }
  }, [moreBusy, busy, view, search, category, country]);

  // Loads the next page by itself when the end of the list is about to come into view (400px before it), so scrolling doesn't
  // stop at a button. The "Show more" button stays for keyboards and for when this can't run.
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = end.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const watcher = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && void showMore(), { rootMargin: "400px" });
    watcher.observe(el);
    return () => watcher.disconnect();
  }, [showMore]);

  const filterOptions = useMemo(() => [{ value: ALL, text: "All" }, ...view.categories.map((c) => ({ value: c.id, text: c.name }))], [view.categories]);
  const filtering = search !== "" || category !== ALL;

  return (
    <main className="@container mx-auto flex w-full flex-col px-4 pb-2.5 md:px-7.5 md:pt-7.5">
      {/* This block is as wide as the columns that fit (350, 740 or 1130px) and centered, so the filter lines up with the
          left edge of the first column. */}
      <div className="mx-auto w-full max-w-87.5 @min-[740px]:max-w-185 @min-[1130px]:max-w-282.5">
        <CategoryFilter value={category} options={filterOptions} onChange={(id) => setChosen({ country, id })} />

        {view.items.length === 0 && !busy && !failed && (
          <p className="text-[14px] text-[#636363]">{filtering ? "No products match your search." : "No products yet."}</p>
        )}

        <ul aria-busy={busy} className={`flex flex-wrap justify-start gap-10 transition-opacity duration-200 ${busy ? "opacity-50" : ""}`}>
          {view.items.map((product, index) => (
            <li key={product.id} className="relative min-h-108 w-full @min-[350px]:w-87.5">
              {/* The whole card (picture, name, price) leads to the product's own page in the marketplace (its business's name and logo are there). */}
              <Link href={marketProductPath(product)} className="block">
                {/* The picture is shown whole (never cropped) inside a grey box with a soft shadow. */}
                <div className="flex h-87.5 items-center justify-center bg-[#f9f9f9] p-6 shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
                  {product.image && (
                    <PlaceholderPicture
                      avif={product.image.card.avif}
                      webp={product.image.card.webp}
                      alt={product.product_name}
                      // The first few are on screen at once: load them at once. The rest wait until they come near.
                      loading={index < 3 ? "eager" : "lazy"}
                      className="size-full"
                      imgClassName="size-full object-contain"
                      placeholder={product.image.placeholder}
                      blockClassName="-inset-6"
                    />
                  )}
                </div>
                <h2 className="pt-3.25 pb-0.75 text-[16px] leading-5.5 font-medium text-[#111] wrap-break-word">{product.product_name}</h2>
                <p className="text-[18px] leading-5.5 font-bold">{formatPrice(product.price)}</p>
              </Link>
              {product.logo && <BusinessLogo product={product} />}
            </li>
          ))}
        </ul>

        {/* The end of the list: what the observer above watches. */}
        <div ref={end} className="flex flex-col items-center gap-2 pt-10 pb-6">
          {view.hasMore && (
            <button
              type="button"
              onClick={() => void showMore()}
              disabled={moreBusy}
              className="flex h-11 cursor-pointer items-center justify-center border-2 border-black bg-white px-8 text-[14px] font-bold disabled:cursor-wait disabled:opacity-60"
            >
              {moreBusy ? "Loading…" : "Show more"}
            </button>
          )}
          {failed && (
            <p role="alert" className="text-[14px] text-red-600">
              We couldn&apos;t load the products. Please try again.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

// The business's logo in the card's top-left corner (110 x 68 at most, fitted inside, never cropped or enlarged, as on the business's own
// page): a link to the business's page.
function BusinessLogo({ product }: { product: FeedItem }) {
  const logo = product.logo!;
  const size = logoDisplaySize(logo.width, logo.height);
  return (
    <Link href={`/${product.slug}`} aria-label={`${product.company_name}: all its products`} className="absolute top-0 left-0 flex h-17 w-27.5 items-start justify-start">
      {size ? (
        <PlaceholderPicture avif={logo.avif} webp={logo.webp} alt="" placeholder={logo.placeholder} className="shrink-0" style={size} />
      ) : (
        <picture className="contents">
          <source srcSet={logo.avif} type="image/avif" />
          <img src={logo.webp} alt="" className={LOGO_FIT_CLASS} />
        </picture>
      )}
    </Link>
  );
}
