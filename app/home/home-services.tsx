"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CategoryFilter from "@/app/[slug]/category-filter";
import PlaceholderPicture from "@/app/components/placeholder-picture";
import { fetchFeedServicesPage, reportSearchClick, type FeedCategory, type FeedServiceItem, type FeedServicesPage } from "@/lib/feed";
import { formatServicePrice } from "@/lib/price";
import { marketServicePath } from "@/lib/product-url";
import FitText from "@/app/components/fit-text";
import CompanyInfo from "./company-info";
import { useHome } from "./home-context";
import PhotoSearchNotice from "./photo-search";

// The Services page's list (Figma "sqrtx Services Phone/Tablet/Desktop new"): the newest services of every business, one row each, like a
// business's own Services page (service-list.tsx: the photo cropped to fill its box, the name, the price, the small black "See more" button and the first
// 8 lines of the description) plus the business's company block (logo, name, kind of business, city: company-info.tsx) in every row, and above the
// first row the filter ("ALL" = the business categories that have a service). Searching, the filter and the country (the bars' picker) ask the
// API for the first page of what was chosen; the next pages come by "Show more" or by themselves when the end of the list is near (the API sends
// no total, only whether there is a next page: see home-feed.tsx).
//  - phone (under 700px of content): one column, per row the company block, the photo (full width, 300px high), then the text, 50px between rows.
//  - tablet (700px up): two columns 328 : 400, the photo (308 x 300) at the left, the company block and the text at the right, the rows touching.
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
}
const keyOf = (q: string, category: string, country: string, city: string, photo: string) => `${q}|${category}|${country}|${city}|${photo}`;

export default function HomeServices({ initial, initialCountry }: { initial: FeedServicesPage; initialCountry: string }) {
  const { submitted: search, country, city, photo, photoFetch } = useHome(); // searched on Enter / the search button, not while typing (home-context.tsx)
  // The chosen category belongs to the country it was chosen in: another country has other categories, so it starts again from "All".
  const [chosen, setChosen] = useState({ country: initialCountry, id: ALL });
  const category = chosen.country === country ? chosen.id : ALL;
  const [view, setView] = useState<View>({
    key: keyOf("", ALL, initialCountry, "", ""),
    items: initial.items,
    hasMore: initial.has_more,
    page: 1,
    categories: initial.categories ?? [],
  });
  const [busy, setBusy] = useState(false); // a search / filter / country is being loaded
  const [moreBusy, setMoreBusy] = useState(false); // the next page is being loaded
  const [failed, setFailed] = useState(false);
  const latest = useRef(0); // only the newest request may change the screen

  // A search by photo: the picture's own address stands for it in the key (the token behind it can be renewed without changing what is on screen).
  const photoKey = photo?.state === "ready" ? photo.url : "";
  const key = keyOf(search, category, country, city, photoKey);

  // A different search, category or country: its first page. The old rows stay (a little faded) until the new ones are here.
  useEffect(() => {
    if (key === view.key) return;
    const id = ++latest.current;
    const controller = new AbortController();
    (async () => {
      setBusy(true);
      setFailed(false);
      try {
        const page = photoKey
          ? await photoFetch((token) => fetchFeedServicesPage({ category, country, city, photoToken: token }, controller.signal))
          : await fetchFeedServicesPage({ q: search, category, country, city }, controller.signal);
        if (id === latest.current) setView({ key, items: page.items, hasMore: page.has_more, page: 1, categories: page.categories ?? [], searchId: page.search_id });
      } catch {
        if (id === latest.current && !controller.signal.aborted) setFailed(true);
      } finally {
        if (id === latest.current) setBusy(false);
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- view.key is compared, not watched: this runs for a new search/category/country
  }, [key, search, category, country, city, photoKey, photoFetch]);

  // The next page of what is on screen.
  const showMore = useCallback(async () => {
    if (moreBusy || busy || !view.hasMore) return;
    const id = ++latest.current;
    setMoreBusy(true);
    setFailed(false);
    try {
      const page = photoKey
        ? await photoFetch((token) => fetchFeedServicesPage({ category, country, city, photoToken: token, page: view.page + 1 }))
        : await fetchFeedServicesPage({ q: search, category, country, city, page: view.page + 1 });
      if (id !== latest.current) return; // a newer search took over meanwhile
      setView((now) => {
        if (now.key !== view.key) return now;
        // A service added while the visitor scrolled shifts the pages by one: the same service is not shown twice.
        const have = new Set(now.items.map((s) => s.id));
        return { ...now, items: [...now.items, ...page.items.filter((s) => !have.has(s.id))], hasMore: page.has_more, page: view.page + 1 };
      });
    } catch {
      if (id === latest.current) setFailed(true);
    } finally {
      if (id === latest.current) setMoreBusy(false);
    }
  }, [moreBusy, busy, view, search, category, country, city, photoKey, photoFetch]);

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

  if (photo && photo.state !== "ready") return <PhotoSearchNotice />; // the photo is being read, or could not be (photo-search.tsx)

  return (
    <main className="@container mx-auto flex w-full flex-col px-4 pb-2.5 md:px-2.5 md:max-[1119px]:pt-5 min-[1120px]:pt-7.5">
      {/* This block is as wide as a row (328, 728 or 1030px) and centered, so the filter lines up with the left edge of the rows. */}
      <div className="mx-auto w-full max-w-82 @min-[700px]:max-w-182 @min-[1030px]:max-w-257.5">
        <CategoryFilter value={category} options={filterOptions} onChange={(id) => setChosen({ country, id })} spacing="mb-8.5 @min-[700px]:mb-5" />

        {view.items.length === 0 && !busy && !failed && (
          <p className="text-[14px] text-[#636363]">{photoKey ? "No services look like your photo." : filtering ? "No services match your search." : "No services yet."}</p>
        )}

        <ul aria-busy={busy} className={`flex flex-col transition-opacity duration-200 ${busy ? "opacity-50" : ""}`}>
          {view.items.map((service, index) => {
            const href = marketServicePath(service);
            return (
              <li
                key={service.id}
                // A thin grey line between two rows, with the same space above and below it (25px on a phone, 10px beside the photo's own 10px on the others), as in service-list.tsx.
                className="grid grid-cols-1 border-t border-[#e5e7eb] py-6.25 first:border-t-0 first:pt-0 last:pb-0 @min-[700px]:grid-cols-[328fr_400fr] @min-[700px]:grid-rows-[auto_1fr] @min-[700px]:py-2.5 @min-[700px]:first:pt-0 @min-[700px]:last:pb-0 @min-[1030px]:grid-cols-[420px_600px] @min-[1030px]:gap-x-2.5"
              >
                <CompanyInfo
                  slug={service.slug}
                  name={service.company_name}
                  typeName={service.company_type}
                  city={service.city}
                  logo={service.logo}
                  className="pb-2.5 @min-[700px]:col-start-2 @min-[700px]:row-start-1 @min-[700px]:px-2.5 @min-[700px]:pt-2.5 @min-[700px]:pb-3"
                />

                {/* The photo is a second way to the same page as the button: left out of the keyboard's way and of the screen reader's. */}
                <Link href={href} onClick={() => reportSearchClick(view.searchId, service.id, index)} tabIndex={-1} aria-hidden className="block @min-[700px]:col-start-1 @min-[700px]:row-span-2 @min-[700px]:row-start-1 @min-[700px]:p-2.5">
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
                        className="size-full"
                        imgClassName="size-full object-cover"
                        placeholder={service.image.placeholder}
                        blockClassName="inset-0 bg-[#f3f4f6]"
                      />
                    )}
                  </div>
                </Link>

                {/* From 700px this box is the rest of the photo's height under the company block; the description fills what is left in it (and is cut after the last line that fits). */}
                <div className="flex min-h-0 min-w-0 flex-col gap-2.5 overflow-hidden pt-2.5 @min-[700px]:col-start-2 @min-[700px]:row-start-2 @min-[700px]:px-2.5 @min-[700px]:pt-0 @min-[700px]:pb-2.5">
                  <div className="flex flex-col gap-1.5">
                    <h2 className="text-[24px] leading-[1.21] font-bold text-black wrap-break-word @min-[700px]:line-clamp-2 @min-[1030px]:text-[32px]">{service.service_name}</h2>
                    <p className="text-[18px] leading-[1.21] font-semibold text-black @min-[1030px]:text-[20px] @min-[1030px]:font-bold">{formatServicePrice(service.price, service.price_type)}</p>
                  </div>
                  {/* 8 lines on a phone; beside the photo as many as fit between the price and the link, then "…" (the API cuts a very long text, see description_cut). */}
                  <FitText text={service.description + (service.description_cut ? "…" : "")} />
                  {/* After the text on every size; from 700px the text's box takes all the room that is left, so the link ends at the photo's bottom edge. */}
                  <Link
                    href={href}
                    onClick={() => reportSearchClick(view.searchId, service.id, index)}
                    aria-label={`See more: ${service.service_name}`}
                    className="mt-1.5 w-fit shrink-0 border-b-[1.5px] border-black pb-1 text-[16px] leading-[1.21] font-bold text-black @min-[700px]:mt-0"
                  >
                    See more
                  </Link>
                </div>
              </li>
            );
          })}
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
              We couldn&apos;t load the services. Please try again.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
