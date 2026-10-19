"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CategoryFilter from "@/app/[lang]/[slug]/category-filter";
import { useCommonText } from "@/app/[lang]/components/lang-context";
import { fetchFeedCompaniesPage, type FeedCategory, type FeedCompaniesPage, type FeedCompanyItem } from "@/lib/feed";
import CompanyInfo from "./company-info";
import { useHome } from "./home-context";
import PhotoSearchNotice from "./photo-search";

// The Companies page's list (Figma "sqrtx Companies Phone/Tablet/Desktop new"): the newest businesses, one block each: its company block (logo,
// name, kind of business, city and a chevron, all one link to its own page: company-info.tsx; the design's separate "Visit" link is gone) and the first 5 lines of its About text under it.
// Above the first one the filter ("ALL" = the business categories of the businesses in the chosen country). The same column on every size:
// at most 700px wide and centered, the blocks 34px apart on a phone and 30px on a tablet and desktop. Searching (the smart search reads the company's name, kind of business, city and About text), the filter and the country (the bars' picker) ask the API for the first page of what was chosen; the next pages come by "Show
// more" or by themselves when the end of the list is near (the API sends no total, only whether there is a next page: see home-feed.tsx).

const ALL = "";

// What is on screen: the companies of ONE search + category + country (`key`), as many pages of them as were asked for.
interface View {
  key: string;
  items: FeedCompanyItem[];
  hasMore: boolean;
  page: number;
  categories: FeedCategory[]; // the business categories of the businesses in this country
  fresh?: boolean; // a new result set just arrived: its blocks fade in one after the other (see home-feed.tsx)
}
const keyOf = (q: string, category: string, country: string, city: string) => `${q}|${category}|${country}|${city}`;

export default function HomeCompanies({ initial, initialCountry }: { initial: FeedCompaniesPage; initialCountry: string }) {
  const { submitted: search, country, city, photo, memory, text, categoryNamer } = useHome(); // searched on Enter / the search button, not while typing (home-context.tsx)
  const common = useCommonText();
  // Coming back to this list (from another tab of the marketplace) it starts from what it showed when it was left (see home-feed.tsx).
  const [saved] = useState(() => memory.get("companies") as { chosen: { country: string; id: string }; view: View } | undefined);
  // Arrived by a link, not Back: the page's own copy of the first page may be an older one the browser kept (the logo does not ask the server again), so the API is asked again at once (home-context.tsx).
  const [reload] = useState(() => !saved && memory.get("reload") === true);
  // The chosen category belongs to the country it was chosen in: another country has other categories, so it starts again from "All".
  const [chosen, setChosen] = useState(saved?.chosen ?? { country: initialCountry, id: ALL });
  const category = chosen.country === country ? chosen.id : ALL;
  const [view, setView] = useState<View>(
    saved?.view ?? {
      key: keyOf("", ALL, initialCountry, "") + (reload ? "|reload" : ""),
      items: initial.items,
      hasMore: initial.has_more,
      page: 1,
      categories: initial.categories ?? [],
    },
  );
  useEffect(() => {
    memory.set("companies", { chosen, view: { ...view, fresh: false } });
  }, [memory, chosen, view]);
  const [busy, setBusy] = useState(false); // a search / filter / country is being loaded
  const [moreBusy, setMoreBusy] = useState(false); // the next page is being loaded
  const [failed, setFailed] = useState(false);
  const latest = useRef(0); // only the newest request may change the screen

  const key = keyOf(search, category, country, city);
  // Loading from the very render in which the key changed, not one render later (see home-feed.tsx).
  const loading = !failed && (busy || key !== view.key);
  // The search box shows a spinner in place of its magnifier meanwhile (home-search.tsx).
  const { setSearching } = useHome();
  useEffect(() => {
    setSearching(loading);
    return () => setSearching(false);
  }, [loading, setSearching]);

  // A different search, category or country: its first page. The old companies stay (a little faded) until the new ones are here.
  useEffect(() => {
    if (key === view.key) return;
    const id = ++latest.current;
    const controller = new AbortController();
    (async () => {
      setBusy(true);
      setFailed(false);
      try {
        const page = await fetchFeedCompaniesPage({ q: search, category, country, city }, controller.signal);
        if (id === latest.current) setView({ key, items: page.items, hasMore: page.has_more, page: 1, categories: page.categories ?? [], fresh: true });
      } catch {
        if (id === latest.current && !controller.signal.aborted) setFailed(true);
      } finally {
        if (id === latest.current) setBusy(false);
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- view.key is compared, not watched: this runs for a new search/category/country
  }, [key, search, category, country, city]);

  // The next page of what is on screen.
  const showMore = useCallback(async () => {
    if (moreBusy || busy || key !== view.key || !view.hasMore) return;
    const id = ++latest.current;
    setMoreBusy(true);
    setFailed(false);
    try {
      const page = await fetchFeedCompaniesPage({ q: search, category, country, city, page: view.page + 1 });
      if (id !== latest.current) return; // a newer search took over meanwhile
      setView((now) => {
        if (now.key !== view.key) return now;
        // A business added while the visitor scrolled shifts the pages by one: the same business is not shown twice.
        const have = new Set(now.items.map((c) => c.slug));
        return { ...now, items: [...now.items, ...page.items.filter((c) => !have.has(c.slug))], hasMore: page.has_more, page: view.page + 1, fresh: false };
      });
    } catch {
      if (id === latest.current) setFailed(true);
    } finally {
      if (id === latest.current) setMoreBusy(false);
    }
  }, [moreBusy, busy, key, view, search, category, country, city]);

  // Loads the next page by itself when the end of the list is about to come into view (400px before it).
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = end.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const watcher = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && void showMore(), { rootMargin: "400px" });
    watcher.observe(el);
    return () => watcher.disconnect();
  }, [showMore]);

  const filterOptions = useMemo(() => [{ value: ALL, text: common.list.all }, ...view.categories.map((c) => ({ value: c.id, text: categoryNamer.name(c.id, c.name) }))], [view.categories, common.list.all, categoryNamer]);
  const filtering = search !== "" || category !== ALL;

  // A business has no photo to compare with: with a photo and no words the notice says so (photo-search.tsx); with words they search the businesses and the photo is not used.
  if (photo && !search) return <PhotoSearchNotice companies />;

  return (
    <main className="mx-auto flex w-full flex-col px-4 md:px-7.5 md:pt-7.5">
      {/* 350px at most on a phone, like the product and service lists (16px at the sides on a 375px phone, the same on a wider one), 740px from 768px, with 30px at the sides like the product list (2026-10-11). */}
      <div className="mx-auto w-full max-w-87.5 md:max-w-185">
        <CategoryFilter value={category} options={filterOptions} onChange={(id) => setChosen({ country, id })} spacing="mb-8.5 md:mb-7.5" />

        {view.items.length === 0 && !loading && !failed && (
          <p className="text-[14px] text-[#636363]">{filtering ? text.companies.searchEmpty : text.companies.empty}</p>
        )}

        {loading && (
          <span role="status" className="sr-only">
            {common.list.searching}
          </span>
        )}

        {/* While a new search / filter / country is loading the companies on screen are dimmed lightly; the new ones fade in one after the other (`fresh`), see home-feed.tsx. */}
        <ul aria-busy={loading} className={`flex flex-col gap-8.5 transition-opacity duration-150 md:gap-7.5 ${loading ? "pointer-events-none opacity-60" : ""}`}>
          {view.items.map((company, index) => (
            <li
              key={company.slug}
              className={`flex flex-col gap-3 ${view.fresh ? "result-in" : ""}`}
              style={view.fresh ? ({ "--i": Math.min(index, 8) } as React.CSSProperties) : undefined}
            >
              <CompanyInfo card slug={company.slug} name={company.company_name} typeName={company.company_type ? categoryNamer.nameOf(company.company_type) : null} city={company.city} logo={company.logo} />
              {/* 5 lines, then "…" (the API sends the first 500 characters). Line breaks the owner typed are kept. */}
              {company.about && <p className="line-clamp-5 text-[16px] leading-5 whitespace-pre-line text-[#111] wrap-break-word">{company.about}</p>}
            </li>
          ))}
        </ul>

        {/* The end of the list: what the observer above watches. The phone's design has 50px under the last company, a tablet's and a desktop's 40px. */}
        <div ref={end} className="flex flex-col items-center gap-2 pt-8.5 pb-12.5 md:pt-7.5 md:pb-10">
          {view.hasMore && !loading && (
            <button
              type="button"
              onClick={() => void showMore()}
              disabled={moreBusy}
              className="flex h-11 cursor-pointer items-center justify-center border-2 border-black bg-white px-8 text-[14px] font-bold disabled:cursor-wait disabled:opacity-60"
            >
              {moreBusy ? common.list.loadingMore : common.list.showMore}
            </button>
          )}
          {failed && (
            <p role="alert" className="text-[14px] text-red-600">
              {text.companies.failed}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
