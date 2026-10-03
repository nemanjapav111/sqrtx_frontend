"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CategoryFilter from "@/app/[slug]/category-filter";
import { fetchFeedCompaniesPage, type FeedCategory, type FeedCompaniesPage, type FeedCompanyItem } from "@/lib/feed";
import CompanyInfo from "./company-info";
import { useHome } from "./home-context";

// The Companies page's list (Figma "sqrtx Companies Phone/Tablet/Desktop new"): the newest businesses, one block each: its company block (logo,
// name, kind of business, city and a chevron, all one link to its own page: company-info.tsx; the design's separate "Visit" link is gone) and the first 5 lines of its About text under it.
// Above the first one the filter ("ALL" = the business categories of the businesses in the chosen country). The same column on every size:
// at most 700px wide and centered, the blocks 34px apart on a phone and 30px on a tablet and desktop. Searching (the company's name and its
// About text), the filter and the country (the bars' picker) ask the API for the first page of what was chosen; the next pages come by "Show
// more" or by themselves when the end of the list is near (the API sends no total, only whether there is a next page: see home-feed.tsx).

const ALL = "";
const SEARCH_DELAY_MS = 300;

// What is on screen: the companies of ONE search + category + country (`key`), as many pages of them as were asked for.
interface View {
  key: string;
  items: FeedCompanyItem[];
  hasMore: boolean;
  page: number;
  categories: FeedCategory[]; // the business categories of the businesses in this country
}
const keyOf = (q: string, category: string, country: string) => `${q}|${category}|${country}`;

export default function HomeCompanies({ initial, initialCountry }: { initial: FeedCompaniesPage; initialCountry: string }) {
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

  // A different search, category or country: its first page. The old companies stay (a little faded) until the new ones are here.
  useEffect(() => {
    if (key === view.key) return;
    const id = ++latest.current;
    const controller = new AbortController();
    (async () => {
      setBusy(true);
      setFailed(false);
      try {
        const page = await fetchFeedCompaniesPage({ q: search, category, country }, controller.signal);
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
      const page = await fetchFeedCompaniesPage({ q: search, category, country, page: view.page + 1 });
      if (id !== latest.current) return; // a newer search took over meanwhile
      setView((now) => {
        if (now.key !== view.key) return now;
        // A business added while the visitor scrolled shifts the pages by one: the same business is not shown twice.
        const have = new Set(now.items.map((c) => c.slug));
        return { ...now, items: [...now.items, ...page.items.filter((c) => !have.has(c.slug))], hasMore: page.has_more, page: view.page + 1 };
      });
    } catch {
      if (id === latest.current) setFailed(true);
    } finally {
      if (id === latest.current) setMoreBusy(false);
    }
  }, [moreBusy, busy, view, search, category, country]);

  // Loads the next page by itself when the end of the list is about to come into view (400px before it).
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
    <main className="mx-auto flex w-full flex-col px-4 md:pt-7.5">
      <div className="mx-auto w-full max-w-175">
        <CategoryFilter value={category} options={filterOptions} onChange={(id) => setChosen({ country, id })} spacing="mb-8.5 md:mb-7.5" />

        {view.items.length === 0 && !busy && !failed && (
          <p className="text-[14px] text-[#636363]">{filtering ? "No companies match your search." : "No companies yet."}</p>
        )}

        <ul aria-busy={busy} className={`flex flex-col gap-8.5 transition-opacity duration-200 md:gap-7.5 ${busy ? "opacity-50" : ""}`}>
          {view.items.map((company) => (
            <li key={company.slug} className="flex flex-col gap-3">
              <CompanyInfo card slug={company.slug} name={company.company_name} typeName={company.company_type} city={company.city} logo={company.logo} />
              {/* 5 lines, then "…" (the API sends the first 500 characters). Line breaks the owner typed are kept. */}
              {company.about && <p className="line-clamp-5 text-[16px] leading-5 whitespace-pre-line text-[#111] wrap-break-word">{company.about}</p>}
            </li>
          ))}
        </ul>

        {/* The end of the list: what the observer above watches. The phone's design has 50px under the last company, a tablet's and a desktop's 40px. */}
        <div ref={end} className="flex flex-col items-center gap-2 pt-8.5 pb-12.5 md:pt-7.5 md:pb-10">
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
              We couldn&apos;t load the companies. Please try again.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
