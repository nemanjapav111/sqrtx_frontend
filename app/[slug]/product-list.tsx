"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PlaceholderPicture from "@/app/components/placeholder-picture";
import { formatPrice } from "@/lib/price";
import { fetchProductsPage, type PublicProductCard, type PublicProductsPage } from "@/lib/public-products";
import CategoryFilter from "./category-filter";
import { useSearch } from "./search-context";

// The Products page content: the category filter ("ALL") and the products, each in a grey box with its picture. The
// search box is in the top bar (business-header.tsx) and this list follows it.
//
// A business can have hundreds of products, so the list is paged: the server sends the first 24 (`initial`, with the
// categories for the filter), and the browser asks the API for the rest ("Show more", or automatically when the end of the list
// comes near), and for a search or a chosen category (the API does the searching, over ALL the products, not only the ones
// loaded so far). Only what a card shows is sent (GET /product/summary in the API notes).
//
// Sizes (Figma 2063:8869 phone, 1957:532 tablet, 1424:452 desktop): a product is 350px wide (the full width on a phone
// narrower than 382px) and at least 432px tall (the design's row height: a name on two lines fills it exactly). They
// wrap into as many columns as fit, 40px apart: one column, two once the page's content is 740px wide, three from 1130px, and
// a last row with fewer products is centered. These are container queries (the width of the content, not the window's): a
// window's width includes its scrollbar and the page's side padding, so with window breakpoints (800px, 1190px) the block could
// be a size for three columns while only two fit, leaving the filter at the left edge of a block whose cards were centered. The filter sits at the left
// edge of that block, 34px above the first row. On tablet and desktop the page has 30px around it.
//
// Not in the design, so placeholders: the words when there is nothing to show or something went wrong, "Show more", and the
// filter's own popup (styled like the account menu, category-filter.tsx). A card leads to the product's own page (product/[id]/,
// Figma 2108:344).

const ALL = "";
const SEARCH_DELAY_MS = 300;

// What is on screen: the products of ONE search + category (`key`), as many pages of them as were asked for.
interface View {
  key: string;
  items: PublicProductCard[];
  total: number;
  page: number;
}
const keyOf = (q: string, category: string) => `${q}|${category}`;

export default function ProductList({ initial, userId, slug }: { initial: PublicProductsPage; userId: string; slug: string }) {
  const { query } = useSearch();
  const [category, setCategory] = useState(ALL);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>({ key: keyOf("", ALL), items: initial.items, total: initial.total, page: 1 });
  const [busy, setBusy] = useState(false); // a search / category is being loaded
  const [moreBusy, setMoreBusy] = useState(false); // the next page is being loaded
  const [failed, setFailed] = useState(false);
  const latest = useRef(0); // only the newest request may change the screen

  // What is searched is what was typed, a moment after the typing stopped.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const key = keyOf(search, category);

  // A different search or category: its first page. The old products stay (a little faded) until the new ones are here.
  useEffect(() => {
    if (key === view.key) return;
    const id = ++latest.current;
    const controller = new AbortController();
    (async () => {
      setBusy(true);
      setFailed(false);
      try {
        const page = await fetchProductsPage(userId, { q: search, category }, controller.signal);
        if (id === latest.current) setView({ key, items: page.items, total: page.total, page: 1 });
      } catch {
        if (id === latest.current && !controller.signal.aborted) setFailed(true);
      } finally {
        if (id === latest.current) setBusy(false);
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- view.key is compared, not watched: this runs for a new search/category
  }, [key, userId, search, category]);

  // The next page of what is on screen.
  const showMore = useCallback(async () => {
    if (moreBusy || busy || view.items.length >= view.total) return;
    const id = ++latest.current;
    setMoreBusy(true);
    setFailed(false);
    try {
      const page = await fetchProductsPage(userId, { q: search, category, page: view.page + 1 });
      if (id !== latest.current) return; // a newer search took over meanwhile
      setView((now) => {
        if (now.key !== view.key) return now;
        const have = new Set(now.items.map((p) => p.id));
        return { ...now, items: [...now.items, ...page.items.filter((p) => !have.has(p.id))], total: page.total, page: view.page + 1 };
      });
    } catch {
      if (id === latest.current) setFailed(true);
    } finally {
      if (id === latest.current) setMoreBusy(false);
    }
  }, [moreBusy, busy, view, userId, search, category]);

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

  const filterOptions = useMemo(
    () => [{ value: ALL, text: "All" }, ...initial.categories.map((c) => ({ value: c, text: c }))],
    [initial.categories],
  );
  const filtering = search !== "" || category !== ALL;
  const hasMore = view.items.length < view.total;

  return (
    <main className="@container mx-auto flex w-full flex-col px-4 pb-2.5 md:px-7.5 md:pt-7.5">
      {/* This block is as wide as the columns that fit (350, 740 or 1130px) and centered, so the filter lines up with the
          left edge of the first column. */}
      <div className="mx-auto w-full max-w-87.5 @min-[740px]:max-w-185 @min-[1130px]:max-w-282.5">
        <CategoryFilter value={category} options={filterOptions} onChange={setCategory} />

        {view.total === 0 && !busy && !failed && (
          <p className="text-[14px] text-[#636363]">{filtering ? "No products match your search." : "No products yet."}</p>
        )}

        <ul aria-busy={busy} className={`flex flex-wrap justify-center gap-10 transition-opacity duration-200 ${busy ? "opacity-50" : ""}`}>
          {view.items.map((product, index) => (
            <li key={product.id} className="min-h-108 w-full @min-[350px]:w-87.5">
              {/* The whole card (picture, name, price) leads to the product's own page (product/[id]). */}
              <Link href={`/${slug}/product/${product.id}`} className="block">
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
                      // Only for an image with no blurred preview: the loading sweep covers the whole card (-inset-6
                      // undoes its p-6), no colour of its own, so the card's grey shows.
                      blockClassName="-inset-6"
                    />
                  )}
                </div>
                <h2 className="pt-3.25 pb-0.75 text-[16px] leading-5.5 font-medium text-[#111] wrap-break-word">{product.product_name}</h2>
                <p className="text-[18px] leading-5.5 font-bold">{formatPrice(product.price)}</p>
              </Link>
            </li>
          ))}
        </ul>

        {/* The end of the list: what the observer above watches. */}
        <div ref={end} className="flex flex-col items-center gap-2 pt-10 pb-6">
          {hasMore && (
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
