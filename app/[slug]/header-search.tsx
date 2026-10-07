"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useRef } from "react";
import ArrowIcon from "@/app/register/arrow-icon";
import BackToProducts from "./back-to-products";
import { useSearch } from "./search-context";

// The search box of the top bar, in the two looks the designs have.
//  - "bar" (phone and tablet, Figma 2063:8902 and 1960:663): a line with a search icon and nothing else. The design's
//    "Find..." text is hidden there, so it is only the icon.
//  - "desktop" (Figma 1424:468): a bordered box that says "Find..." with a square icon button at its end.
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
      className="flex h-9 w-full min-w-56.75 max-w-106 flex-1 items-center"
    >
      <input
        ref={input}
        type="search"
        aria-label={searchLabel}
        placeholder="Find..."
        value={query}
        onChange={(e) => type(e.target.value)}
        autoComplete="off"
        className="h-full min-w-0 flex-1 border border-[#b8b8b8] bg-white px-1.75 text-[15px] outline-none placeholder:text-[#8f8f8f] [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="submit"
        aria-label="Search"
        className="-ml-px flex h-full w-11.25 shrink-0 cursor-pointer items-center justify-center border border-[#b8b8b8] bg-[#f9f9f9]"
      >
        <SearchIcon className="size-4" color="#000" width="2.5" />
      </button>
    </form>
  );
}
