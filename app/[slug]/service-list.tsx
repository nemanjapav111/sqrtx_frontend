"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PlaceholderPicture from "@/app/components/placeholder-picture";
import { formatServicePrice } from "@/lib/price";
import { servicePath } from "@/lib/product-url";
import { fetchServicesPage, type PublicServiceRow, type PublicServicesPage } from "@/lib/public-services";
import FitText from "@/app/components/fit-text";
import CategoryFilter from "./category-filter";
import { useSearch } from "./search-context";

// The Services page content: the category filter ("ALL") and the services, one row each: a photo, the name, the price, a black
// "See more" button (small, to the service's own page) and the first lines of the description. The search box is in the top bar
// (business-header.tsx) and this list follows it, exactly like the Products page (product-list.tsx, whose paging and searching this
// repeats: the API does the searching over ALL the services, the first 24 come with the page, the rest by "Show more" or
// automatically when the end of the list comes near; GET /service/summary in the API notes).
//
// Sizes (Figma "Services Phone new" 2122:619, "Services Tablet new" 2027:396, "Services Desktop new" 1642:161; measured 2026-10-01
// from the captured designs). A row, by the width of the content (container queries, not the window's, like the products' list):
//  - phone: one column. The photo (full width, 300px tall, cropped to fill, no rounded corners), 20px below it the name (Inter bold
//    24/29), the price (Inter semibold 18/22, 6px under the name), 10px under that the black button (small since 2026-10-03: 36px high, "See more" Inter semibold 14; the design had 192 x 41, bold 16, "See More")
//    10px under that the description (Inter 16/20, #111, 8 lines then "…"). 42px between a description's last line and the next photo.
//  - tablet, from 700px of content: two columns 328 : 400 (the content shrinks them a little when it is narrower than 728),
//    each with 10px around it, so the text starts level with the photo and the rows are 20px apart.
//  - desktop, from 1030px of content: two columns, 420 and 600 (photo 400 x 300, text 580), 10px apart, rows 40px apart; the name is
//    32/39 bold and the price 20/24 bold.
// The filter is the same one as on the Products page, at the left edge of the first row: 34px above the photo on a phone, and 20px
// above the first row's own 10px on tablet and desktop (the photo is 78px below the filter's top in both).
// The photo is the API's list size (fits inside 1000 x 750, made for this row: it shows the photo cropped to fill 328 x 300, and the card size (604) would be soft on a sharp screen; the detail size (1536 x 900) is twice the bytes).
// From 700px the text column is as high as the photo and the description is cut after the last line that fits under the name, the price and the button (fit-text.tsx).
// Around the rows: 16px at the sides on a phone and 10px on a tablet (the design has no wider margin), 20px above the filter on a tablet and
// 30px on a desktop (the design's content starts 20px under the bar, and the desktop's row has 10px of its own).
// Changed 2026-10-07 (owner's choice from a mock-up): "See more" is a bold 16px text link with a thin black underline instead of the small black
// button (no arrow), after the description on a phone and at the bottom of the text column (the photo's bottom edge) from 700px, and a thin grey
// line (#e5e7eb) separates two rows. Everything else is as designed.
// Not in the design, so placeholders: the words when there is nothing to show or something went wrong, "Show more", and the filter's popup.

const ALL = "";

// What is on screen: the services of ONE search + category (`key`), as many pages of them as were asked for.
interface View {
  key: string;
  items: PublicServiceRow[];
  total: number;
  page: number;
}
const keyOf = (q: string, category: string) => `${q}|${category}`;

export default function ServiceList({ initial, userId, slug }: { initial: PublicServicesPage; userId: string; slug: string }) {
  const { submitted: search } = useSearch(); // searched on Enter / the search button, not while typing (search-context.tsx)
  const [category, setCategory] = useState(ALL);
  const [view, setView] = useState<View>({ key: keyOf("", ALL), items: initial.items, total: initial.total, page: 1 });
  const [busy, setBusy] = useState(false); // a search / category is being loaded
  const [moreBusy, setMoreBusy] = useState(false); // the next page is being loaded
  const [failed, setFailed] = useState(false);
  const latest = useRef(0); // only the newest request may change the screen

  const key = keyOf(search, category);

  // A different search or category: its first page. The old services stay (a little faded) until the new ones are here.
  useEffect(() => {
    if (key === view.key) return;
    const id = ++latest.current;
    const controller = new AbortController();
    (async () => {
      setBusy(true);
      setFailed(false);
      try {
        const page = await fetchServicesPage(userId, { q: search, category }, controller.signal);
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
      const page = await fetchServicesPage(userId, { q: search, category, page: view.page + 1 });
      if (id !== latest.current) return; // a newer search took over meanwhile
      setView((now) => {
        if (now.key !== view.key) return now;
        const have = new Set(now.items.map((s) => s.id));
        return { ...now, items: [...now.items, ...page.items.filter((s) => !have.has(s.id))], total: page.total, page: view.page + 1 };
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
    <main className="@container mx-auto flex w-full flex-col px-4 pb-2.5 md:px-2.5 md:max-[1119px]:pt-5 min-[1120px]:pt-7.5">
      {/* This block is as wide as a row (328, 728 or 1030px) and centered, so the filter lines up with the left edge of the rows. */}
      <div className="mx-auto w-full max-w-82 @min-[700px]:max-w-182 @min-[1030px]:max-w-257.5">
        <CategoryFilter value={category} options={filterOptions} onChange={setCategory} spacing="mb-8.5 @min-[700px]:mb-5" />

        {view.total === 0 && !busy && !failed && (
          <p className="text-[14px] text-[#636363]">{filtering ? "No services match your search." : "No services yet."}</p>
        )}

        <ul
          aria-busy={busy}
          className={`flex flex-col transition-opacity duration-200 ${busy ? "opacity-50" : ""}`}
        >
          {view.items.map((service, index) => {
            const href = servicePath(slug, service);
            return (
              <li
                key={service.id}
                // A thin grey line between two rows, with the same space above and below it (21px on a phone, 20px beside the photo's own 10px on the others).
                className="grid grid-cols-1 gap-5 border-t border-[#e5e7eb] py-5.25 first:border-t-0 first:pt-0 last:pb-0 @min-[700px]:grid-cols-[328fr_400fr] @min-[700px]:gap-0 @min-[700px]:py-2.5 @min-[700px]:first:pt-0 @min-[700px]:last:pb-0 @min-[1030px]:grid-cols-[420px_600px] @min-[1030px]:gap-x-2.5"
              >
                {/* The photo is a second way to the same page as the button: left out of the keyboard's way and of the screen reader's. */}
                <Link href={href} tabIndex={-1} aria-hidden className="block @min-[700px]:p-2.5">
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

                {/* From 700px the text column is exactly as high as the photo's box (300px and 10px around), and the description fills what is left in it. */}
                <div className="flex min-w-0 flex-col gap-2.5 @min-[700px]:h-80 @min-[700px]:p-2.5">
                  <div className="flex flex-col gap-1.5">
                    <h2 className="text-[24px] leading-[1.21] font-bold text-black wrap-break-word @min-[700px]:line-clamp-2 @min-[1030px]:text-[32px]">{service.service_name}</h2>
                    <p className="text-[18px] leading-[1.21] font-semibold text-black @min-[1030px]:text-[20px] @min-[1030px]:font-bold">
                      {formatServicePrice(service.price, service.price_type)}
                    </p>
                  </div>
                  {/* 8 lines on a phone; beside the photo as many as fit between the price and the link, then "…" (the API cuts a very long text, see description_cut). */}
                  <FitText text={service.description + (service.description_cut ? "…" : "")} />
                  {/* After the text on every size; from 700px the text's box takes all the room that is left, so the link ends at the photo's bottom edge. */}
                  <Link
                    href={href}
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
              We couldn&apos;t load the services. Please try again.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
