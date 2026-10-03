"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useHome } from "./home-context";

// The search of the home page, in the two looks the designs have. The list follows what is typed (typing is enough: the button of the
// desktop box only puts the cursor back in it).
//  - "line" (phone and tablet, Figma "tablet_search_bar"): a line with a search icon, the design's "Find..." text is hidden there. The same
//    look as the business pages' line (header-search.tsx, "bar").
//  - "desktop" (Figma "search bar", in the black bar): a white box that says "Find..." with a grey (#d4d4d4) square button at its end, 38px high.
// On a product's own page (Figma "sqrtx Product Details Phone/Tablet new") the phone/tablet line has a back arrow in front of it (44px, like
// the business pages'), and typing in either box takes the visitor back to the list, which follows what was typed (the text lives in the
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
  const { query, setQuery } = useHome();
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

  if (variant === "line") {
    const line = (
      <label className="flex h-11 min-w-0 flex-1 items-center gap-1 border-b border-[#b8b8b8] px-1.75">
        <SearchIcon className="size-5 shrink-0" color="#b8b8b8" width="2.5" />
        <span className="sr-only">{searchLabel}</span>
        <input
          ref={input}
          type="search"
          value={query}
          onChange={(e) => type(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent px-1 text-[16px] outline-none [&::-webkit-search-cancel-button]:hidden"
        />
      </label>
    );
    // (The way back to the list is on the product's or service's page itself, with words: item-detail.tsx.)
    return <div className="flex min-w-0 flex-1 items-center">{line}</div>;
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        e.currentTarget.querySelector("input")?.focus();
      }}
      className="flex h-9.5 min-w-0 max-w-134.5 flex-1 items-center"
    >
      <input
        ref={input}
        type="search"
        aria-label={searchLabel}
        placeholder="Find..."
        value={query}
        onChange={(e) => type(e.target.value)}
        autoComplete="off"
        className="h-full min-w-0 flex-1 bg-white px-1.75 text-[15px] text-black outline-none placeholder:text-[#8f8f8f] [&::-webkit-search-cancel-button]:hidden"
      />
      <button type="submit" aria-label="Search" className="flex h-full w-11.25 shrink-0 cursor-pointer items-center justify-center bg-[#d4d4d4]">
        <SearchIcon className="size-4.75" color="#000" width="2.5" />
      </button>
    </form>
  );
}
