"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useRef } from "react";
import ArrowIcon from "@/app/register/arrow-icon";
import BackToProducts from "./back-to-products";
import { useSearch } from "./search-context";

// The search box of the top bar, in the two looks the designs have.
//  - "bar" (phone and tablet, Figma 2063:8902 and 1960:663): a line with a search icon and nothing else. The design's
//    "Find..." text is hidden there, so it is only the icon.
//  - "desktop" (Figma 1424:468 had a bordered box with a square icon button at its end; since 2026-10-08, the owner's choice from a mock-up): a line
//    like the phone's, 280px at most, with the search icon at its start (it is the submit button, Enter does the same) and "Find..." after it; the line
//    turns black while the box has the focus.
// On a product's or a service's own page (Figma 2108:344) the phone/tablet line has a back arrow to the list in front of it (on desktop the
// arrow is in the page's top left corner instead, see item-detail.tsx), and typing in either box takes the visitor back to the list (the text
// lives in the layout, so it is still there).
// Both search the business's products or services (the page asks the API) when the visitor presses Enter or the search button,
// not while typing: the search is read by an AI model, which cannot make sense of half-typed words. Emptying the box changes
// nothing until Enter is pressed (an empty search shows everything).
function SearchIcon({ className, color, width }: { className: string; color: string; width: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/**
 * The search line under the top bar on phone and tablet (20px above and below it on the phone; on the tablet only below, centered and at most 390px
 * wide). NOT drawn on the Contact and About pages (owner's request 2026-10-07): there is no list there to search, and the line only took room
 * from the page. The line's own space goes with it (the box around it is not drawn either), so the page starts right under the bar.
 */
export function HeaderSearchLine({ servicesPath }: { servicesPath: string }) {
  const pathname = usePathname();
  if (/^\/[^/]+\/(contact|about)\/?$/i.test(pathname)) return null;
  return (
    <div className="keep-width py-5 md:pt-0 min-[1120px]:hidden">
      <div className="mx-auto max-w-97.5 px-4 md:px-5">
        <HeaderSearch variant="bar" servicesPath={servicesPath} />
      </div>
    </div>
  );
}

// `servicesPath`: where this business's services' list is (its own address, or /services, see tabs.ts's tabPath).
export default function HeaderSearch({ variant, servicesPath }: { variant: "bar" | "desktop"; servicesPath: string }) {
  const { query, setQuery, submit } = useSearch();
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const pathname = usePathname();
  const onProductPage = /^\/[^/]+\/product\//.test(pathname);
  const onServicePage = /^\/[^/]+\/service\//.test(pathname);
  const onDetailPage = onProductPage || onServicePage;
  // The list a detail page leads back to, and what the search looks through on the page the visitor is on.
  const listPath = onServicePage ? servicesPath : `/${slug}`;
  const forServices = onServicePage || pathname.toLowerCase() === servicesPath.toLowerCase();
  const searchLabel = forServices ? "Search services" : "Search products";
  const type = (value: string) => {
    setQuery(value);
    if (onDetailPage) router.push(listPath);
  };

  const search = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit(query);
    input.current?.blur(); // closes the phone's keyboard so the results can be seen
  };

  if (variant === "bar") {
    const line = (
      <form role="search" onSubmit={search} className="flex h-11 min-w-0 flex-1 items-center gap-1 border-b border-[#b8b8b8] px-1.75">
        <button type="submit" aria-label="Search" className="flex shrink-0 cursor-pointer items-center">
          <SearchIcon className="size-5 shrink-0" color="#b8b8b8" width="2.5" />
        </button>
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
      </form>
    );
    if (!onDetailPage) return line;
    // The arrow's 44px box starts 6px from the screen's edge and overlaps the line by 1px, like the design.
    return (
      <div className="flex items-center">
        <BackToProducts
          slug={slug}
          to={listPath}
          label={onServicePage ? "Back to services" : "Back to products"}
          className="-mr-px -ml-2.5 flex size-11 shrink-0 items-center justify-center"
        >
          <ArrowIcon className="h-5 w-5.5 rotate-180" strokeWidth={1.6} />
        </BackToProducts>
        {line}
      </div>
    );
  }

  return (
    <form
      role="search"
      onSubmit={search}
      className="flex h-9 w-full min-w-40 max-w-70 flex-1 items-center gap-2.5 border-b border-[#b8b8b8] pl-1 focus-within:border-black"
    >
      {/* The icon is the submit button too (Enter does the same). */}
      <button type="submit" aria-label="Search" className="flex shrink-0 cursor-pointer items-center">
        <SearchIcon className="size-4" color="#8f8f8f" width="2.2" />
      </button>
      <input
        ref={input}
        type="search"
        aria-label={searchLabel}
        placeholder="Find..."
        value={query}
        onChange={(e) => type(e.target.value)}
        autoComplete="off"
        className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#8f8f8f] [&::-webkit-search-cancel-button]:hidden"
      />
    </form>
  );
}
