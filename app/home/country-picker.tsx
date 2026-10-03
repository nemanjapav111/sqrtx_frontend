"use client";

import { useEffect, useRef, useState } from "react";
import { ALL_COUNTRIES, countryName } from "@/lib/feed";
import { useHome } from "./home-context";

// The country picker ("US ▾" with a map pin, Figma "sqrtx location footer link"): the products shown are those of the businesses in the
// chosen country. It lists the countries that have at least one product, and "All countries" first. In the phone's bottom bar (variant
// "bar": a pin over the code, the list opens UPWARDS), at the end of the tablet's black row of links (variant "tablet": the code beside the
// pin, Inter 600 14px) and in the desktop's black bar (variant "desktop": a pin and the code in Inter bold 16px: the design's 20px made "ALL"
// too big); both open downwards. The code has a fixed width (the widest two letters, "WW", fit): "ALL" and "RS" take the same room, so
// choosing a country does not move the links and the search box beside the picker. The list is the same plain white box as the other popups
// (category-filter.tsx). The ▾ is drawn as a small chevron: the character is not in the Inter files the site loads.
// The list starts 4px under the 44px button (about 16px under the pin and the code, which sit in the middle of it): the owner found that
// distance right, and the account menu on the home page's black bar (visitor-icon.tsx, `light`) now keeps the same one from its icon.
// With many countries the list gets a search box at its top (from SEARCH_FROM countries on: with a handful it would only be in the way). It looks
// in the name and the code; the cursor is put in it on a computer, not on a phone (the keyboard would cover the list).
const SEARCH_FROM = 8;

export default function CountryPicker({ countries, variant, className = "" }: { countries: readonly string[]; variant: "bar" | "tablet" | "desktop"; className?: string }) {
  const { country, setCountry } = useHome();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const withSearch = countries.length >= SEARCH_FROM;

  // Closes on a click outside, or on Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Opening with a search box: the cursor goes in it (on a computer).
  useEffect(() => {
    if (open && withSearch && window.matchMedia("(pointer: fine)").matches) searchRef.current?.focus();
  }, [open, withSearch]);

  const all = [{ value: ALL_COUNTRIES, text: "All countries" }, ...countries.map((code) => ({ value: code, text: countryName(code) }))];
  const words = search.trim().toLowerCase();
  const options = words ? all.filter((o) => o.value !== ALL_COUNTRIES && (o.text.toLowerCase().includes(words) || o.value.toLowerCase() === words)) : all;
  const bar = variant === "bar";
  const desktop = variant === "desktop";
  const label = country || "ALL";

  return (
    <div ref={rootRef} className={`relative ${bar ? "flex flex-1" : ""} ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Country: ${country ? countryName(country) : "all countries"}`}
        onClick={() => {
          setSearch(""); // it starts empty every time
          setOpen((v) => !v);
        }}
        className={`flex cursor-pointer items-center justify-center ${
          bar
            ? "h-11 w-full flex-col text-[11px] leading-[17px] font-medium text-black"
            : desktop
              ? "h-11 gap-1.5 text-[14px] leading-[1.21] font-bold text-white"
              : "h-11 gap-1.75 text-[14px] leading-[17px] font-semibold text-white"
        }`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className={`shrink-0 ${desktop ? "size-4" : bar ? "size-4" : "size-3.5"}`} fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="inline-flex items-center gap-0.5">
          <span className={`inline-block text-center ${desktop ? "w-7.5" : bar ? "w-6" : "w-7.5"}`}>{label}</span>
          <svg aria-hidden viewBox="0 0 24 24" className="size-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <div className={`absolute right-0 z-40 flex max-h-72 w-56 flex-col border border-[#b8b8b8] bg-white text-black ${bar ? "bottom-full mb-px" : "top-full mt-1"}`}>
          {withSearch && (
            <label className="flex h-11 shrink-0 items-center border-b border-[#b8b8b8] px-4.25 md:h-9">
              <span className="sr-only">Search countries</span>
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#8f8f8f] md:text-[14px] [&::-webkit-search-cancel-button]:hidden"
              />
            </label>
          )}
          <div role="listbox" aria-label="Country" className="flex min-h-0 flex-col overflow-y-auto overscroll-contain">
            {options.map((option, i) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === country}
                onClick={() => {
                  setCountry(option.value);
                  setOpen(false);
                }}
                className={`flex h-11 shrink-0 cursor-pointer items-center px-4.25 text-left text-[16px] hover:bg-[#4b5563]/10 md:h-9 md:text-[14px] ${
                  i === 0 ? "" : "border-t border-[#b8b8b8]"
                } ${option.value === country ? "font-bold" : ""}`}
              >
                {option.text}
              </button>
            ))}
            {options.length === 0 && <p className="px-4.25 py-3 text-[14px] text-[#636363]">No country found.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
