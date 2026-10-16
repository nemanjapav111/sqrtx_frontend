"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { Dictionary } from "@/app/[lang]/dictionaries/en";

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
  searching: boolean; // the list is loading a search: the box shows a spinner in place of its magnifier (header-search.tsx)
  setSearching: (value: boolean) => void;
  // What the lists showed when the visitor left them for an item's page (the pages already loaded, the chosen category): this layout stays while they move between the
  // two, so coming back the list is built again from it (the same as the marketplace's, app/home/home-context.tsx) instead of from the first 24, and the browser can return to where they were.
  memory: Map<string, unknown>;
}
const SearchContext = createContext<Search | null>(null);
// The business pages' own words (the dictionary's `business`) for the bars and the lists, which are client components in the layout's shell.
const TextContext = createContext<Dictionary["business"] | null>(null);

export function SearchProvider({ text, children }: { text: Dictionary["business"]; children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [searching, setSearching] = useState(false);
  const [memory] = useState(() => new Map<string, unknown>());
  const submit = useCallback((value: string) => setSubmitted(value.trim()), []);
  return (
    <TextContext.Provider value={text}>
      <SearchContext.Provider value={{ query, setQuery, submitted, submit, searching, setSearching, memory }}>{children}</SearchContext.Provider>
    </TextContext.Provider>
  );
}

export function useBusinessText() {
  const text = useContext(TextContext);
  if (!text) throw new Error("useBusinessText must be used inside a SearchProvider.");
  return text;
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) throw new Error("useSearch must be used inside a SearchProvider.");
  return context;
}
