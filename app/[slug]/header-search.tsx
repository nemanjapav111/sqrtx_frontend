"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useSearch } from "./search-context";

// The search box of the top bar, in the two looks the designs have.
//  - "bar" (phone and tablet, Figma 2063:8902 and 1960:663): a line with a search icon and nothing else. The design's
//    "Find..." text is hidden there, so it is only the icon.
//  - "desktop" (Figma 1424:468): a bordered box that says "Find..." with a square icon button at its end.
// On a product's own page (Figma 2108:344) the phone/tablet line has a back arrow to the products in front of it, and typing
// in either box takes the visitor back to the products, where the list follows what was typed (the text lives in the
// layout, so it is still there).
// Both look at product names and categories (the products page does the filtering). Typing is enough: the button on the
// desktop box only moves the cursor back into it, because the list already follows every letter.
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
  const { query, setQuery } = useSearch();
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

  if (variant === "bar") {
    const line = (
      <label className="flex h-11 min-w-0 flex-1 items-center gap-1 border-b border-[#b8b8b8] px-1.75">
        <SearchIcon className="size-5 shrink-0" color="#b8b8b8" width="2.5" />
        <span className="sr-only">{searchLabel}</span>
        <input
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
    return line;
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        e.currentTarget.querySelector("input")?.focus();
      }}
      className="flex h-9 w-full min-w-56.75 max-w-106 flex-1 items-center"
    >
      <input
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
