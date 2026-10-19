"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Dictionary } from "@/app/[lang]/dictionaries/en";
import { categoryNamer, type CategoryNamer, type CategoryTable } from "@/lib/category-names";
import { ApiError, COUNTRY_COOKIE, uploadSearchPhoto } from "@/lib/feed";

// What the visitor typed in the search box, which country (and city) they chose on the home page and which photo they picked to search by. The search
// box is in the top bar, the location picker in the bottom bar (or the top bar) and the list is in the page, so the three share it through this (the
// same idea as the business pages' search-context.tsx).
// `query` is what is in the box right now; `submitted` is what was searched for: set only when the visitor presses Enter or the search button
// (an empty box then shows everything), because the products' and services' search is the smart one (an AI model reads the words, for the companies too), which cannot make sense of
// half-typed words and costs a model run for each search. The three lists (products, services, companies) all search on `submitted`.
// The country is also written to a cookie (a year, nothing else in it) when it is chosen, so the server draws the page for it on the next
// visit instead of the first page of "all countries" and then changing it. The CITY is not kept: it belongs to its country, so a new country
// clears it, and it is only for this visit (the server does not know it, so the page would otherwise be drawn for the whole country first).
// `photo`: a picture the visitor picked with the camera button of the search box, to search by it (photo-search.tsx). Picking it uploads it AT ONCE
// (shrunk to 512 px, uploadSearchPhoto in lib/feed.ts) and the API answers a `token` that the lists ask the pages of the answer with; the token lasts 15
// minutes, so a list that is told "expired" (410) asks for a new one with the same file (`photoFetch`). Until the token is here (`state` "uploading") the lists
// wait; if it cannot be had (`state` "failed", with the reason in `problem`) they say so. The preview is a browser address of the file, kept until the photo is removed.
export type PhotoState = "uploading" | "ready" | "failed";
/** Why a photo could not be used: a code, the words are in the dictionary (home.photo). */
export type PhotoProblem = "unusable" | "tooMany" | "unavailable" | "unreadable";
export interface HomePhoto {
  url: string; // the browser's own address of the picked file, for the small preview
  name: string;
  file: File;
  state: PhotoState;
  token: string; // "" until the upload is done
  problem: PhotoProblem | ""; // why it failed, "" otherwise
}
interface Home {
  /** The marketplace's texts in the language of the page (the dictionary's `home`), for the components of the top bar, the lists and the location picker. */
  text: Dictionary["home"];
  /** The category names in the language of the page, for the lists' category filters. */
  categoryNamer: CategoryNamer;
  query: string;
  setQuery: (value: string) => void;
  submitted: string; // trimmed; "" = no search
  submit: (value: string) => void;
  country: string; // two letters, "" for all countries
  setCountry: (value: string) => void;
  city: string; // "" = the whole country (or all countries)
  setCity: (value: string) => void;
  photo: HomePhoto | null;
  choosePhoto: (file: File) => void;
  clearPhoto: () => void;
  /** Runs a request that needs the photo's token; when the API says the token has expired (410) it uploads the photo again and runs it once more. */
  photoFetch: <T>(run: (token: string) => Promise<T>) => Promise<T>;
  /** What each list (products, services, companies) had on screen when it was left, so coming back (the Back arrow of a product's page) shows it again instead of asking the API again. */
  memory: Map<string, unknown>;
  /** A list is loading a new search / filter / country: the search box shows a small spinner in place of its magnifier. Set by the lists. */
  searching: boolean;
  setSearching: (value: boolean) => void;
}
// Tells how the visitor arrived at a path: with the browser's Back / Forward (a popstate came just before) or by a link.
class Arrivals {
  private path: string;
  private popped = false;
  constructor(path: string) {
    this.path = path;
  }
  pop() {
    this.popped = true;
  }
  /** True when the path changed by a link to a list page, which must show a fresh list; a product's or service's own page keeps what the lists show. */
  arrive(path: string): boolean {
    if (path === this.path) return false;
    const back = this.popped;
    this.popped = false;
    this.path = path;
    return !back && !/\/(product|service)\/[^/]+\/?$/.test(path);
  }
}

const HomeContext = createContext<Home | null>(null);

/** Why the photo could not be used (the words are home.photo.<code>). */
function problemOf(err: unknown): PhotoProblem {
  if (err instanceof ApiError) {
    if (err.status === 400 || err.status === 413) return "unusable";
    if (err.status === 429) return "tooMany";
    if (err.status === 503) return "unavailable";
  }
  return "unreadable";
}

export function HomeProvider({
  initialCountry,
  text,
  categoryTable,
  children,
}: {
  initialCountry: string;
  text: Dictionary["home"];
  categoryTable: CategoryTable | null;
  children: React.ReactNode;
}) {
  const namer = useMemo(() => categoryNamer(categoryTable), [categoryTable]);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const submit = useCallback((value: string) => setSubmitted(value.trim()), []);
  const [country, setCountryState] = useState(initialCountry);
  const [city, setCity] = useState("");
  const setCountry = useCallback((value: string) => {
    setCountryState(value);
    setCity("");
    document.cookie = `${COUNTRY_COOKIE}=${value || "all"}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  // The lists are rebuilt each time the visitor leaves them (to a product's page) and returns; this provider is not, so what they showed is kept here
  // for the visit (lost on a reload, like the search text). A list starts from it when its `key` (search + category + country...) still matches.
  const [memory] = useState(() => new Map<string, unknown>());
  // The remembered lists are for the browser's Back / Forward only (which also restores the scroll position). Any other way of arriving at a list (the logo,
  // a menu link, a Link) must show a fresh one, so the memory is emptied when the path changes without a popstate (Back / Forward fire it just before the
  // path changes) and the new page is not a product's or service's own page (those are left again by Back, which needs the lists as they were). Done while
  // rendering, because the list built for the new path reads the memory in its first render, before any effect of this provider could run.
  const pathname = usePathname();
  const [nav] = useState(() => new Arrivals(pathname));
  useEffect(() => {
    const onPop = () => {
      nav.pop();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [nav]);
  if (nav.arrive(pathname)) memory.clear();
  const [searching, setSearching] = useState(false);

  const [photo, setPhoto] = useState<HomePhoto | null>(null);
  // The photo as the latest render has it, for photoFetch below. A LAYOUT effect: it must be set before the lists' own effects run (those ask for the page with
  // the new token the moment it is here, and a plain effect of this parent runs after theirs).
  const current = useRef<HomePhoto | null>(null);
  useLayoutEffect(() => {
    current.current = photo;
  }, [photo]);
  // The upload in flight for the photo that is on screen; picking another photo (or removing it) abandons it.
  const upload = useRef<{ file: File; controller: AbortController; promise: Promise<string> } | null>(null);

  const startUpload = useCallback((file: File): Promise<string> => {
    upload.current?.controller.abort();
    const controller = new AbortController();
    const promise = uploadSearchPhoto(file, controller.signal);
    upload.current = { file, controller, promise };
    return promise;
  }, []);

  const choosePhoto = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      setPhoto({ url, name: file.name, file, state: "uploading", token: "", problem: "" });
      startUpload(file).then(
        (token) => setPhoto((now) => (now && now.file === file ? { ...now, state: "ready", token } : now)),
        (err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return; // another photo took over
          setPhoto((now) => (now && now.file === file ? { ...now, state: "failed", problem: problemOf(err) } : now));
        },
      );
    },
    [startUpload],
  );

  const clearPhoto = useCallback(() => {
    upload.current?.controller.abort();
    upload.current = null;
    setPhoto(null);
  }, []);

  // The address of a removed (or replaced) photo is given back to the browser.
  useEffect(() => {
    const url = photo?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo?.url]);

  const photoFetch = useCallback(
    async <T,>(run: (token: string) => Promise<T>): Promise<T> => {
      const now = current.current;
      if (!now || now.state !== "ready") throw new Error("There is no photo to search by");
      try {
        return await run(now.token);
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 410) throw err;
        // The token has expired: the same file is uploaded again, then the request is made once more.
        const token = await startUpload(now.file);
        setPhoto((was) => (was && was.file === now.file ? { ...was, state: "ready", token } : was));
        return run(token);
      }
    },
    [startUpload],
  );

  return (
    <HomeContext.Provider value={{ text, categoryNamer: namer, query, setQuery, submitted, submit, country, setCountry, city, setCity, photo, choosePhoto, clearPhoto, photoFetch, memory, searching, setSearching }}>
      {children}
    </HomeContext.Provider>
  );
}

export function useHome() {
  const context = useContext(HomeContext);
  if (!context) throw new Error("useHome must be used inside a HomeProvider.");
  return context;
}
