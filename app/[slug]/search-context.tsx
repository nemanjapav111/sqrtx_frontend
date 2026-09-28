"use client";

import { createContext, useContext, useState } from "react";

// What the visitor typed in the search box. The box is in the top bar (which the layout draws) and the products are in
// the page, so the two share it through this. The top bar holds up to two search boxes (only one is ever shown, which
// one depends on the screen size), and they all read and write the same text.
const SearchContext = createContext<{ query: string; setQuery: (value: string) => void } | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  return <SearchContext.Provider value={{ query, setQuery }}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) throw new Error("useSearch must be used inside a SearchProvider.");
  return context;
}
