"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import BackToProducts from "@/app/[slug]/back-to-products";
import ArrowIcon from "@/app/register/arrow-icon";
import { useHome } from "./home-context";
import { CameraButton, PhotoChip } from "./photo-search";

// The search of the home page, in the two looks the designs have. The products, services and companies are searched when the visitor presses Enter
// or the search button (the AI search cannot read half-typed words and costs a model run per search); emptying the box changes nothing until
// Enter is pressed (an empty search shows everything).
//  - "line" (phone and tablet, Figma "tablet_search_bar"): a line with a search icon, the design's "Find..." text is hidden there. The same
//    look as the business pages' line (header-search.tsx, "bar").
//  - "desktop" (Figma "search bar", in the black bar; since 2026-10-08 the owner's design from a mock-up): a big white field, 46px high and 460px at most: the
//    magnifier (the submit button) at its start, "Search products..." (the page's own word) as the placeholder and the camera button at its end. A picked photo
//    is a chip after the magnifier (photo-search.tsx). The line variant has the camera at its end too.
// On a product's own page (Figma "sqrtx Product Details Phone/Tablet new") the phone/tablet line has a back arrow in front of it (44px, like
// the business pages'), and typing in either box takes the visitor back to the list, which searches on Enter (the text lives in the
// layout, so it is still there, and so is the cursor).
function SearchIcon({ className, color, width }: { className: string; color: string; width: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/** The search line under the black bar on phone and tablet (20px above and below it): not drawn on the About page, whose phone and tablet designs have none. */
export function HomeSearchLine() {
  if (usePathname() === "/about") return null;
  return (
    <div className="keep-width py-5 min-[1120px]:hidden">
      <div className="mx-auto flex max-w-97.5 px-4 md:px-5">
        <HomeSearch variant="line" />
      </div>
    </div>
  );
}

export default function HomeSearch({ variant }: { variant: "line" | "desktop" }) {
  const { query, setQuery, submit, photo } = useHome();
  const router = useRouter();
  const pathname = usePathname();
  // A product's or a service's own page: the arrow in front of the line leads back to its list, and typing goes there (the products' list is
  // the home page, the services' is /services). On the list pages typing only filters what is shown.
  const onServicePage = pathname.startsWith("/service/");
  const onProductPage = pathname.startsWith("/product/") || onServicePage;
  const listPath = onServicePage ? "/services" : "/";
  // The About page has no list: typing in the search (only the desktop's, the phone's and tablet's bar has none there) takes the visitor to the products.
  const onAboutPage = pathname === "/about";
  const searchLabel = pathname === "/services" || onServicePage ? "Search services" : pathname === "/companies" ? "Search companies" : "Search products";
  // Typing on a product's page takes the visitor to the list; the router then moves the cursor to the top of the new page, so the box asks
  // for it back (only the box that was typed in: the other, hidden one cannot take it).
  const input = useRef<HTMLInputElement>(null);
  const refocus = useRef(false);
  useEffect(() => {
    if (!refocus.current || onProductPage || onAboutPage) return;
    refocus.current = false;
    const timer = setTimeout(() => input.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, [pathname, onProductPage, onAboutPage]);
  const type = (value: string) => {
    setQuery(value);
    if (onProductPage || onAboutPage) {
      refocus.current = true;
      router.push(listPath);
    }
  };

  const search = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit(query);
    input.current?.blur(); // closes the phone's keyboard so the results can be seen
  };

  if (variant === "line") {
    const line = (
      <form role="search" onSubmit={search} className="flex h-11 min-w-0 flex-1 items-center gap-1 border-b border-[#b8b8b8] px-1.75">
        <button type="submit" aria-label="Search" className="flex shrink-0 cursor-pointer items-center">
          <SearchIcon className="size-5 shrink-0" color="#b8b8b8" width="2.5" />
        </button>
        <PhotoChip />
        {/* With a photo picked there is nothing to type: the API searches by the photo alone. */}
        {photo ? (
          <span className="flex-1" />
        ) : (
          <label className="min-w-0 flex-1">
            <span className="sr-only">{searchLabel}</span>
            <input
              ref={input}
              type="search"
              value={query}
              onChange={(e) => type(e.target.value)}
              autoComplete="off"
              enterKeyHint="search"
              className="w-full min-w-0 bg-transparent px-1 text-[16px] outline-none [&::-webkit-search-cancel-button]:hidden"
            />
          </label>
        )}
        <CameraButton className="text-black" />
      </form>
    );
    // The arrow's 44px box starts 6px from the screen's edge and overlaps the line by 1px, like the design. The line is the SAME element
    // with or without the arrow (the arrow is only added in front of it), so typing, which takes the visitor from a product's page to the
    // list, does not rebuild the box and the cursor stays in it. (On desktop the arrow is in the page's top left corner: item-detail.tsx.)
    return (
      <div className="flex min-w-0 flex-1 items-center">
        {onProductPage && (
          <BackToProducts slug="" to={listPath} label={onServicePage ? "Back to services" : "Back to products"} className="-mr-px -ml-2.5 flex size-11 shrink-0 items-center justify-center">
            <ArrowIcon className="h-5 w-5.5 rotate-180" strokeWidth={1.6} />
          </BackToProducts>
        )}
        {line}
      </div>
    );
  }

  return (
    <form role="search" onSubmit={search} className="flex h-11.5 w-full max-w-115 min-w-60 flex-1 items-center gap-3 bg-white px-3.5">
      <button type="submit" aria-label="Search" className="flex shrink-0 cursor-pointer items-center">
        <SearchIcon className="size-5" color="#000" width="2.2" />
      </button>
      <PhotoChip />
      {photo ? (
        <span className="flex-1" />
      ) : (
        <input
          ref={input}
          type="search"
          aria-label={searchLabel}
          placeholder={`${searchLabel}...`}
          value={query}
          onChange={(e) => type(e.target.value)}
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-black outline-none placeholder:text-[#8f8f8f] [&::-webkit-search-cancel-button]:hidden"
        />
      )}
      <CameraButton className="text-black" />
    </form>
  );
}
