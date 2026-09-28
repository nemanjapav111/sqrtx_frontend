"use client";

import { useSearch } from "./search-context";

// The search box of the top bar, in the two looks the designs have.
//  - "bar" (phone and tablet, Figma 2063:8902 and 1960:663): a line with a search icon and nothing else. The design's
//    "Find..." text is hidden there, so it is only the icon.
//  - "desktop" (Figma 1424:468): a bordered box that says "Find..." with a square icon button at its end.
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

export default function HeaderSearch({ variant }: { variant: "bar" | "desktop" }) {
  const { query, setQuery } = useSearch();

  if (variant === "bar") {
    return (
      <label className="flex h-11 items-center gap-1 border-b border-[#b8b8b8] px-1.75">
        <SearchIcon className="size-5 shrink-0" color="#b8b8b8" width="2.5" />
        <span className="sr-only">Search products</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent px-1 text-[16px] outline-none [&::-webkit-search-cancel-button]:hidden"
        />
      </label>
    );
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
        aria-label="Search products"
        placeholder="Find..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
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
