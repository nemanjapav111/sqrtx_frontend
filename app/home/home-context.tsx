"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { COUNTRY_COOKIE } from "@/lib/feed";

// What the visitor typed in the search box and which country they chose on the home page. The search box is in the top bar, the country
// picker in the bottom bar (or the top bar) and the list is in the page, so the three share it through this (the same idea as the
// business pages' search-context.tsx).
// The country is also written to a cookie (a year, nothing else in it) when it is chosen, so the server draws the page for it on the next
// visit instead of the first page of "all countries" and then changing it.
interface Home {
  query: string;
  setQuery: (value: string) => void;
  country: string; // two letters, "" for all countries
  setCountry: (value: string) => void;
}
const HomeContext = createContext<Home | null>(null);

export function HomeProvider({ initialCountry, children }: { initialCountry: string; children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [country, setCountryState] = useState(initialCountry);
  const setCountry = useCallback((value: string) => {
    setCountryState(value);
    document.cookie = `${COUNTRY_COOKIE}=${value || "all"}; path=/; max-age=31536000; samesite=lax`;
  }, []);
  return <HomeContext.Provider value={{ query, setQuery, country, setCountry }}>{children}</HomeContext.Provider>;
}

export function useHome() {
  const context = useContext(HomeContext);
  if (!context) throw new Error("useHome must be used inside a HomeProvider.");
  return context;
}
