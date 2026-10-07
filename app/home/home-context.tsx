"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { COUNTRY_COOKIE } from "@/lib/feed";

// What the visitor typed in the search box and which country they chose on the home page. The search box is in the top bar, the country
// picker in the bottom bar (or the top bar) and the list is in the page, so the three share it through this (the same idea as the
// business pages' search-context.tsx).
// `query` is what is in the box right now; `submitted` is what was searched for: set only when the visitor presses Enter or the search button
// (an empty box then shows everything), because the products' and services' search is the smart one (an AI model reads the words, for the companies too), which cannot make sense of
// half-typed words and costs a model run for each search. The three lists (products, services, companies) all search on `submitted`.
// The country is also written to a cookie (a year, nothing else in it) when it is chosen, so the server draws the page for it on the next
// visit instead of the first page of "all countries" and then changing it.
interface Home {
  query: string;
  setQuery: (value: string) => void;
  submitted: string; // trimmed; "" = no search
  submit: (value: string) => void;
  country: string; // two letters, "" for all countries
  setCountry: (value: string) => void;
}
const HomeContext = createContext<Home | null>(null);

export function HomeProvider({ initialCountry, children }: { initialCountry: string; children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const submit = useCallback((value: string) => setSubmitted(value.trim()), []);
  const [country, setCountryState] = useState(initialCountry);
  const setCountry = useCallback((value: string) => {
    setCountryState(value);
    document.cookie = `${COUNTRY_COOKIE}=${value || "all"}; path=/; max-age=31536000; samesite=lax`;
  }, []);
  return <HomeContext.Provider value={{ query, setQuery, submitted, submit, country, setCountry }}>{children}</HomeContext.Provider>;
}

export function useHome() {
  const context = useContext(HomeContext);
  if (!context) throw new Error("useHome must be used inside a HomeProvider.");
  return context;
}
