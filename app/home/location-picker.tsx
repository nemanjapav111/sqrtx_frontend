"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ALL_COUNTRIES, countryName, fetchFeedCities, type FeedCity, type FeedKind } from "@/lib/feed";
import { useHome } from "./home-context";

// The location picker (it was the country picker; the owner's design 2026-10-08): a pin with the place chosen, and a list that opens on it. The products,
// services and companies shown are those of the businesses in the chosen place. The list has two parts:
//  - the COUNTRY at its top (a row that opens the countries that have at least one product or service, and "All countries" first), and
//  - under it the CITIES of that country, "All of <country>" first, each with how many items it has on the page the visitor is on (products, services or
//    companies: GET /feed/cities in the API notes), a tick on the chosen one, and a search box ("Find a city") once there are many. With "All
//    countries" there is no city list: a city belongs to its country. Choosing a country keeps the list open, so the city can be chosen next; choosing a
//    city (or "All of ...") closes it.
// Where it is: in the phone's bottom bar (variant "bar": a pin over the place, the list opens UPWARDS), at the end of the tablet's black row of links
// (variant "tablet": the place beside the pin, Inter 600 14px) and in the desktop's black bar (variant "desktop": a pin, the place in Inter bold 14px and a
// small chevron); both open downwards. The place on the button is the city, or the country's code, or "ALL". The list is a white card with a soft shadow.
// The cities of a country are asked for when the list opens and kept for the visit (by page and country). The city is not remembered between visits (see
// home-context.tsx). The chevrons are drawn: the character is not in the Inter files the site loads.
const COUNTRY_SEARCH_FROM = 8;
const CITY_SEARCH_FROM = 6;

const CHEVRON = (
  <svg aria-hidden viewBox="0 0 24 24" className="size-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const TICK = (
  <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/** Which list the counts are for, from the page the visitor is on. */
function useKind(): FeedKind {
  const path = usePathname();
  if (path === "/services" || path.startsWith("/service/")) return "services";
  if (path === "/companies") return "companies";
  return "products";
}

const ROW = "flex h-11 w-full shrink-0 cursor-pointer items-center justify-between gap-3 px-4.5 text-left text-[16px] hover:bg-[#f3f4f6] md:h-10 md:text-[15px]";

export default function LocationPicker({ countries, variant, className = "" }: { countries: readonly string[]; variant: "bar" | "tablet" | "desktop"; className?: string }) {
  const { country, setCountry, city, setCity } = useHome();
  const kind = useKind();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"main" | "countries">("main");
  const [countrySearch, setCountrySearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [cities, setCities] = useState<FeedCity[] | null>(null); // null: not loaded (yet)
  const [failed, setFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const known = useRef(new Map<string, FeedCity[]>()); // the cities already asked for: "<page>|<country>"

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

  // The cities of the chosen country, when the list is open (the page's own counts: products, services or companies).
  useEffect(() => {
    if (!open || !country) return;
    const cacheKey = `${kind}|${country}`;
    const cached = known.current.get(cacheKey);
    if (cached) {
      setCities(cached);
      setFailed(false);
      return;
    }
    setCities(null);
    setFailed(false);
    const controller = new AbortController();
    fetchFeedCities(kind, country, controller.signal)
      .then((list) => {
        known.current.set(cacheKey, list);
        setCities(list);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [open, country, kind]);

  // The cursor goes in the search box of the list that has one (on a computer; on a phone the keyboard would cover the list).
  const withCountrySearch = countries.length >= COUNTRY_SEARCH_FROM;
  const withCitySearch = (cities?.length ?? 0) >= CITY_SEARCH_FROM;
  useEffect(() => {
    if (!open || !window.matchMedia("(pointer: fine)").matches) return;
    if ((view === "countries" && withCountrySearch) || (view === "main" && withCitySearch)) searchRef.current?.focus();
  }, [open, view, withCountrySearch, withCitySearch]);

  const bar = variant === "bar";
  const desktop = variant === "desktop";
  const label = city || country || "ALL";
  const place = city || (country ? countryName(country) : "all countries");

  const words = countrySearch.trim().toLowerCase();
  const allCountries = [{ value: ALL_COUNTRIES, text: "All countries" }, ...countries.map((code) => ({ value: code, text: countryName(code) }))];
  const countryOptions = words ? allCountries.filter((o) => o.value !== ALL_COUNTRIES && (o.text.toLowerCase().includes(words) || o.value.toLowerCase() === words)) : allCountries;
  const cityWords = citySearch.trim().toLowerCase();
  const cityOptions = (cities ?? []).filter((c) => !cityWords || c.name.toLowerCase().includes(cityWords));

  const searchBox = (value: string, onChange: (value: string) => void, placeholder: string) => (
    <label className="mx-4.5 flex h-10 shrink-0 items-center gap-2 border-b border-[#b8b8b8] focus-within:border-black">
      <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="#8f8f8f" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <span className="sr-only">{placeholder}</span>
      <input
        ref={searchRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#8f8f8f] md:text-[15px] [&::-webkit-search-cancel-button]:hidden"
      />
    </label>
  );

  return (
    <div ref={rootRef} className={`relative ${bar ? "flex flex-1" : ""} ${className}`}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Location: ${place}`}
        onClick={() => {
          setView("main");
          setCountrySearch(""); // the boxes start empty every time
          setCitySearch("");
          setOpen((v) => !v);
        }}
        className={`flex cursor-pointer items-center justify-center ${
          bar
            ? "h-14.5 w-full flex-col gap-1 px-1 text-[12px] leading-[17px] font-medium text-[#6b7280] [&_svg]:size-5.5 [&_svg]:[stroke-width:1.6]"
            : desktop
              ? "h-11 gap-1.5 text-[14px] leading-[1.21] font-bold text-white"
              : "h-11 gap-1.75 text-[14px] leading-[17px] font-semibold text-white"
        }`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className={`shrink-0 ${desktop ? "size-4" : bar ? "size-4" : "size-3.5"}`} fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="inline-flex max-w-full min-w-0 items-center gap-0.5">
          <span className={`truncate text-center ${bar ? "max-w-18" : "max-w-28 min-w-7.5"}`}>{label}</span>
          {!bar && CHEVRON}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Location"
          className={`absolute right-0 z-40 flex max-h-[min(30rem,70dvh)] w-75 max-w-[calc(100vw-1rem)] flex-col border border-[#e5e7eb] bg-white py-2 text-black shadow-[0_8px_28px_rgba(0,0,0,0.28)] ${
            bar ? "bottom-full mb-px" : "top-full mt-1"
          }`}
        >
          {view === "countries" ? (
            <>
              <button type="button" onClick={() => setView("main")} className="flex h-10 shrink-0 cursor-pointer items-center gap-2 px-4.5 text-[13px] font-medium text-[#8f8f8f]">
                <svg aria-hidden viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M11 6l-6 6 6 6" />
                </svg>
                Country
              </button>
              {withCountrySearch && searchBox(countrySearch, setCountrySearch, "Search countries")}
              <div role="listbox" aria-label="Country" className="flex min-h-0 flex-col overflow-y-auto overscroll-contain">
                {countryOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={option.value === country}
                    onClick={() => {
                      setCountry(option.value);
                      setView("main");
                    }}
                    className={`${ROW} ${option.value === country ? "font-semibold" : ""}`}
                  >
                    {option.text}
                    {option.value === country && TICK}
                  </button>
                ))}
                {countryOptions.length === 0 && <p className="px-4.5 py-3 text-[14px] text-[#636363]">No country found.</p>}
              </div>
            </>
          ) : (
            <>
              <p className="shrink-0 px-4.5 text-[13px] leading-[1.2] font-medium text-[#8f8f8f]">Country</p>
              <button
                type="button"
                onClick={() => setView("countries")}
                className="mx-4.5 mt-1.5 mb-1 flex h-10 shrink-0 cursor-pointer items-center justify-between border-b border-[#e5e7eb] text-left text-[16px] md:text-[15px]"
              >
                {country ? countryName(country) : "All countries"}
                {CHEVRON}
              </button>

              {country ? (
                <>
                  {withCitySearch && <div className="mt-2 flex shrink-0 flex-col">{searchBox(citySearch, setCitySearch, "Find a city")}</div>}
                  <div role="listbox" aria-label="City" className="mt-1 flex min-h-0 flex-col overflow-y-auto overscroll-contain">
                    {!citySearch.trim() && (
                      <button
                        type="button"
                        role="option"
                        aria-selected={city === ""}
                        onClick={() => {
                          setCity("");
                          setOpen(false);
                        }}
                        className={`${ROW} ${city === "" ? "font-semibold" : ""}`}
                      >
                        All of {countryName(country)}
                        {city === "" && TICK}
                      </button>
                    )}
                    {cityOptions.map((option) => (
                      <button
                        key={option.name}
                        type="button"
                        role="option"
                        aria-selected={option.name.toLowerCase() === city.toLowerCase()}
                        onClick={() => {
                          setCity(option.name);
                          setOpen(false);
                        }}
                        className={`${ROW} ${option.name.toLowerCase() === city.toLowerCase() ? "font-semibold" : ""}`}
                      >
                        <span className="min-w-0 truncate">{option.name}</span>
                        {option.name.toLowerCase() === city.toLowerCase() ? TICK : <span className="text-[13px] font-normal text-[#8f8f8f]">{option.count}</span>}
                      </button>
                    ))}
                    {cities === null && !failed && <p className="px-4.5 py-3 text-[14px] text-[#636363]">Loading cities…</p>}
                    {failed && (
                      <p role="alert" className="px-4.5 py-3 text-[14px] text-red-600">
                        We couldn&apos;t load the cities.
                      </p>
                    )}
                    {cities !== null && cities.length === 0 && <p className="px-4.5 py-3 text-[14px] text-[#636363]">No cities yet.</p>}
                    {cities !== null && cities.length > 0 && cityOptions.length === 0 && <p className="px-4.5 py-3 text-[14px] text-[#636363]">No city found.</p>}
                  </div>
                </>
              ) : (
                <p className="px-4.5 pt-2 pb-2 text-[14px] leading-5 text-[#636363]">Choose a country to pick a city.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
