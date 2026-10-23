"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useListRestore } from "@/app/[lang]/components/list-restore";
import CategoryFilter from "@/app/[lang]/[slug]/category-filter";
import { CompanyLine } from "@/app/[lang]/components/company-line";
import { useCommonText } from "@/app/[lang]/components/lang-context";
import PlaceholderPicture from "@/app/[lang]/components/placeholder-picture";
import { fetchFeedServicesPage, reportSearchClick, type FeedCategory, type FeedServiceItem, type FeedServicesPage } from "@/lib/feed";
import { fill } from "@/lib/i18n";
import { formatServicePrice } from "@/lib/price";
import { marketServicePath } from "@/lib/product-url";
import FitText from "@/app/[lang]/components/fit-text";
import { useHome, useListStart } from "./home-context";
import PhotoSearchNotice from "./photo-search";
import Loading from "@/app/[lang]/components/loading";

// The Services page's list (Figma "sqrtx Services Phone/Tablet/Desktop new"): the newest services of every business, one row each, like a
// business's own Services page (service-list.tsx: the photo cropped to fill its box, the name, the price, the small black "See more" button and the first
// 8 lines of the description) plus the business's slim line (logo, name, city: components/company-line.tsx) in every row, UNDER the name and the price (2026-10-11, owner), and above the
// first row the filter ("ALL" = the business categories that have a service). Searching, the filter and the country (the bars' picker) ask the
// API for the first page of what was chosen; the next pages come by "Show more" or by themselves when the end of the list is near (the API sends
// no total, only whether there is a next page: see home-feed.tsx).
//  - phone (under 700px of content): one column, per row the photo (full width, 300px high), then the text (name, price, the company line, description), 50px between rows.
//  - tablet (700px up): two columns 328 : 400, the photo (308 x 300) at the left, the text at the right, the rows touching.
//  - desktop (1030px up): 420 : 600, the photo 400 x 300, the rows 20px apart.
// These are container queries (the width of the content, not the window's), like the business pages' lists. "See more" and the photo lead to the
// service's own page in the marketplace (app/(sqrtx)/service/[id]).
// Changed 2026-10-07 (owner), the same as service-list.tsx: "See more" is a bold underlined text link (no arrow) after the description on a phone and
// at the bottom of the text column from 700px, and a thin grey line separates two rows (the phone's 50px between rows are 25px on each side of it).

const ALL = "";

// What is on screen: the services of ONE search + category + country (`key`), as many pages of them as were asked for.
interface View {
  key: string;
  items: FeedServiceItem[];
  hasMore: boolean;
  page: number;
  categories: FeedCategory[]; // the business categories that have a service in this country
  searchId?: string; // the id of the search these services answer (from its first page), sent back with a click
  fresh?: boolean; // a new result set just arrived: its rows fade in one after the other (see home-feed.tsx)
}
/** What a list keeps for coming back to it: the category chosen (with its country) and what is on screen. */
interface ListState {
  chosen: { country: string; id: string };
  view: View;
}
const keyOf = (q: string, category: string, country: string, city: string, photo: string) => `${q}|${category}|${country}|${city}|${photo}`;

export default function HomeServices({ initial, initialCountry }: { initial: FeedServicesPage; initialCountry: string }) {
  const { submitted: search, country: homeCountry, city, photo, photoFetch, memory, text, categoryNamer } = useHome(); // searched on Enter / the search button, not while typing (home-context.tsx)
  const common = useCommonText();
  const country = homeCountry ?? initialCountry; // the page was drawn for the visitor's country; the shell learns it a moment later (home-context.tsx)
  // The page's own list is the unfiltered one of its country: with a search, a city or a photo already chosen (kept by the shell when the visitor went to another page and back) it is not what is wanted, so nothing is shown until the right one is here.
  const pageFits = country === initialCountry && !search && !city && !photo;
  // Coming back from a service's page this list is built again: it starts from what it showed when it was left (see home-feed.tsx).
  const { saved, link } = useListStart<ListState>("services");
  // The chosen category belongs to the country it was chosen in: another country has other categories, so it starts again from "All".
  const startPhoto = photo?.state === "ready" ? photo.url : "";
  // Arrived by a link (not Back): what the list showed is used only if it is what is wanted now (no other category), and the API is asked again quietly (home-context.tsx, useListStart).
  const remembered = saved && (!link || (saved.chosen.id === ALL && saved.view.key.replace(/|reload$/, "") === keyOf(search, ALL, country, city, startPhoto))) ? saved : undefined;
  const kept = useListRestore<ListState>({
    name: "services",
    inMemory: saved !== undefined,
    accepts: (state) => state.chosen.country === country && state.view.key === keyOf(search, state.chosen.id, country, city, startPhoto),
    apply: (state) => {
      setChosen(state.chosen);
      setView({ ...state.view, fresh: false });
    },
  });
  const [chosen, setChosen] = useState(remembered?.chosen ?? kept.start?.chosen ?? { country: initialCountry, id: ALL });
  const category = chosen.country === country ? chosen.id : ALL;
  const [view, setView] = useState<View>(
    (remembered && link ? { ...remembered.view, key: remembered.view.key.replace(/|reload$/, "") + "|reload", fresh: false } : remembered?.view) ?? (kept.start ? { ...kept.start.view, fresh: false } : undefined) ?? {
      key: keyOf("", ALL, initialCountry, "", "") + (link ? "|reload" : ""),
      // The page may be an older one (Back from a business's page brings back the copy the browser kept, drawn for another country): then nothing of it is shown, the right list is asked for.
      items: pageFits ? initial.items : [],
      hasMore: pageFits && initial.has_more,
      page: 1,
      categories: pageFits ? (initial.categories ?? []) : [],
    },
  );
  useEffect(() => {
    memory.set("services", { chosen, view: { ...view, fresh: false } });
  }, [memory, chosen, view]);
  const [busy, setBusy] = useState(false); // a search / filter / country is being loaded
  const [moreBusy, setMoreBusy] = useState(false); // the next page is being loaded
  const [failed, setFailed] = useState(false);
  const latest = useRef(0); // only the newest request may change the screen

  // A search by photo: the picture's own address stands for it in the key (the token behind it can be renewed without changing what is on screen).
  const photoKey = photo?.state === "ready" ? photo.url : "";
  const key = keyOf(search, category, country, city, photoKey);
  // Loading from the very render in which the key changed, not one render later (see home-feed.tsx).
  // Asking again for a list that is on screen already (arrived by a link, see home-context.tsx): not dimmed, and the new cards do not fade in, so nothing flashes.
  const reloading = view.key === `${key}|reload`;
  const loading = photo?.state === "uploading" || (!failed && !reloading && (busy || key !== view.key));
  // The search box shows a spinner in place of its magnifier meanwhile (home-search.tsx).
  const { setSearching } = useHome();
  useEffect(() => {
    setSearching(loading || reloading); // a quiet refresh shows the search box's spinner too, though the list is not dimmed
    return () => setSearching(false);
  }, [loading, reloading, setSearching]);

  // A different search, category or country: its first page. The old rows stay (a little faded) until the new ones are here.
  useEffect(() => {
    if (kept.consumeRestored()) return; // the list was just put back from storage: the quiet ask for a fresh first page (a link arrival) would replace it
    if (key === view.key) return;
    const id = ++latest.current;
    const controller = new AbortController();
    (async () => {
      setBusy(true);
      setFailed(false);
      try {
        const page = photoKey
          ? await photoFetch((token) => fetchFeedServicesPage({ q: search, category, country, city, photoToken: token }, controller.signal))
          : await fetchFeedServicesPage({ q: search, category, country, city }, controller.signal);
        if (id === latest.current) setView({ key, items: page.items, hasMore: page.has_more, page: 1, categories: page.categories ?? [], searchId: page.search_id, fresh: !reloading });
      } catch {
        if (id !== latest.current || controller.signal.aborted) return;
        // A quiet second ask that could not be answered: what is on screen stays, with no error (it is only a refresh).
        if (reloading) setView((now) => ({ ...now, key }));
        else setFailed(true);
      } finally {
        if (id === latest.current) setBusy(false);
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- view.key is compared, not watched: this runs for a new search/category/country
  }, [key, search, category, country, city, photoKey, photoFetch]);

  // The next page of what is on screen.
  const showMore = useCallback(async () => {
    if (moreBusy || busy || key !== view.key || !view.hasMore) return;
    const id = ++latest.current;
    setMoreBusy(true);
    setFailed(false);
    try {
      const page = photoKey
        ? await photoFetch((token) => fetchFeedServicesPage({ q: search, category, country, city, photoToken: token, page: view.page + 1 }))
        : await fetchFeedServicesPage({ q: search, category, country, city, page: view.page + 1 });
      if (id !== latest.current) return; // a newer search took over meanwhile
      setView((now) => {
        if (now.key !== view.key) return now;
        // A service added while the visitor scrolled shifts the pages by one: the same service is not shown twice.
        const have = new Set(now.items.map((s) => s.id));
        return { ...now, items: [...now.items, ...page.items.filter((s) => !have.has(s.id))], hasMore: page.has_more, page: view.page + 1, fresh: false };
      });
    } catch {
      if (id === latest.current) setFailed(true);
    } finally {
      if (id === latest.current) setMoreBusy(false);
    }
  }, [moreBusy, busy, key, view, search, category, country, city, photoKey, photoFetch]);

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

  if (photo?.state === "failed") return <PhotoSearchNotice />; // the photo could not be read (photo-search.tsx); while it is being read the list is dimmed

  return (
    <main className="@container mx-auto flex w-full flex-col px-4 pb-2.5 md:px-7.5 md:pt-7.5">
      {/* This block is as wide as a row (350 on a phone, like the product cards: 16px at the sides on a 375px phone; then 740 or 1030px: 30px at the sides and 30px above on a tablet, the product list's, 2026-10-11) and centered, so the filter lines up with the left edge of the rows. */}
      <div className="mx-auto w-full max-w-87.5 @min-[700px]:max-w-185 @min-[1030px]:max-w-257.5">
        <CategoryFilter value={category} options={filterOptions} onChange={(id) => setChosen({ country, id })} spacing="mb-8.5 @min-[700px]:mb-5" />

        {view.items.length === 0 && !loading && !failed && (
          <p className="text-[14px] text-[#636363]">{photoKey ? text.services.photoEmpty : filtering ? text.services.searchEmpty : text.services.empty}</p>
        )}

        {loading && (
          <span role="status" className="sr-only">
            {common.list.searching}
          </span>
        )}

        {/* While a new search / filter / country is loading the services on screen are dimmed lightly; the new ones fade in one after the other (`fresh`), see home-feed.tsx. */}
        <ul aria-busy={loading} className={`flex flex-col transition-opacity duration-150 ${loading ? "pointer-events-none opacity-60" : ""}`}>
          {view.items.map((service, index) => {
            const href = marketServicePath(service);
            return (
              <li
                key={service.id}
                onClick={(event) => (event.target as HTMLElement).closest("a") && kept.remember({ chosen, view: { ...view, fresh: false } })} // any link of the row leaves the list
                style={view.fresh ? ({ "--i": Math.min(index, 8) } as React.CSSProperties) : undefined}
                // A thin grey line between two rows, with the same space above and below it (25px on a phone, 10px beside the photo's own 10px on the others), as in service-list.tsx.
                className={`${view.fresh ? "result-in " : ""}grid grid-cols-1 border-t border-[#e5e7eb] py-6.25 first:border-t-0 first:pt-0 last:pb-0 @min-[700px]:grid-cols-[328fr_400fr] @min-[700px]:py-2.5 @min-[700px]:first:pt-0 @min-[700px]:last:pb-0 @min-[1030px]:grid-cols-[420px_600px] @min-[1030px]:gap-x-2.5`}
              >
                {/* The photo is a second way to the same page as the button: left out of the keyboard's way and of the screen reader's. */}
                <Link href={href} onClick={() => reportSearchClick(view.searchId, service.id, index)} tabIndex={-1} aria-hidden className="block @min-[700px]:col-start-1 @min-[700px]:row-start-1 @min-[700px]:p-2.5">
                  {/* A cover photo: it fills its box (cropped at the edges), no frame (the owner wanted it back like this, 2026-10-03). */}
                  <div className="h-75 w-full overflow-hidden bg-[#f3f4f6]">
                    {service.image && (
                      <PlaceholderPicture
                        avif={service.image.detail.avif}
                        avif3x={service.image.detail3x?.avif}
                        webp={service.image.detail.webp}
                        alt=""
                        // The first rows are on screen at once: load them at once. The rest wait until they come near.
                        loading={index < 2 ? "eager" : "lazy"}
                        instant={index < 4 && !view.fresh} // the first screen as the server drew it: not hidden until the scripts have run (placeholder-picture.tsx); not for search results (`fresh`)
                        className="size-full"
                        imgClassName="size-full object-cover"
                        placeholder={service.image.placeholder}
                        blockClassName="inset-0 bg-[#f3f4f6]"
                      />
                    )}
                  </div>
                </Link>

                {/* From 700px this box is as high as the photo; the description fills what is left in it under the name, the price and the company line (and is cut after the last line that fits). */}
                <div className="flex min-h-0 min-w-0 flex-col gap-2.5 overflow-hidden pt-2.5 @min-[700px]:col-start-2 @min-[700px]:row-start-1 @min-[700px]:px-2.5 @min-[700px]:pt-2.5 @min-[700px]:pb-2.5">
                  <div className="flex flex-col gap-1.5">
                    <h2 className="text-[24px] leading-[1.21] font-bold text-black wrap-break-word @min-[700px]:line-clamp-2 @min-[1030px]:text-[32px]">{service.service_name}</h2>
                    <p className="text-[18px] leading-[1.21] font-semibold text-black @min-[1030px]:text-[20px] @min-[1030px]:font-bold">{formatServicePrice(service.price, service.price_type, service.currency, common.price)}</p>
                  </div>
                  {/* Whose it is: under the name and the price, a link to the business's page. */}
                  <CompanyLine slug={service.slug} name={service.company_name} city={service.city} logo={service.logo} />
                  {/* 8 lines on a phone; beside the photo as many as fit between the price and the link, then "…" (the API cuts a very long text, see description_cut). */}
                  <FitText text={service.description + (service.description_cut ? "…" : "")} />
                  {/* After the text on every size; from 700px the text's box takes all the room that is left, so the link ends at the photo's bottom edge. */}
                  <Link
                    href={href}
                    onClick={() => reportSearchClick(view.searchId, service.id, index)}
                    aria-label={fill(text.services.seeMoreFor, { name: service.service_name })}
                    className="mt-1.5 w-fit shrink-0 border-b-[1.5px] border-black pb-1 text-[16px] leading-[1.21] font-bold text-black @min-[700px]:mt-0"
                  >
                    {text.services.seeMore}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>

        {/* The end of the list: what the observer above watches. */}
        <div ref={end} className="flex flex-col items-center gap-2 pt-10 pb-6">
          {view.hasMore && !loading && (
            moreBusy ? (
              <Loading />
            ) : (
              <button
                type="button"
                onClick={() => void showMore()}
                disabled={moreBusy}
                className="flex h-11 cursor-pointer items-center justify-center border-2 border-black bg-white px-8 text-[14px] font-bold disabled:cursor-wait disabled:opacity-60"
              >
                {common.list.showMore}
              </button>
            )
          )}
          {failed && (
            <p role="alert" className="text-[14px] text-red-600">
              {text.services.failed}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
