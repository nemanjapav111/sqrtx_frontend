"use client";

import { createContext, useCallback, useContext, useState } from "react";

// What the visitor typed in the search box. The box is in the top bar (which the layout draws) and the products are in
// the page, so the two share it through this. The top bar holds up to two search boxes (only one is ever shown, which
// one depends on the screen size), and they all read and write the same text.
// `query` is what is in the box right now; `submitted` is what was searched for: set only when the visitor presses Enter or the search button (an
// empty box then shows everything), because the search of a business's products and services is the smart one (an AI model reads the words), which
// cannot make sense of half-typed words and costs a model run for each search (the same as the home page's, app/home/home-context.tsx).
interface Search {
  query: string;
  setQuery: (value: string) => void;
  submitted: string; // trimmed; "" = no search
  submit: (value: string) => void;
}
const SearchContext = createContext<Search | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const submit = useCallback((value: string) => setSubmitted(value.trim()), []);
  return <SearchContext.Provider value={{ query, setQuery, submitted, submit }}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) throw new Error("useSearch must be used inside a SearchProvider.");
  return context;
}
