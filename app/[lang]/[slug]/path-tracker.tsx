"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Remembers which page of this business's site the visitor was on before the current one, so a "back to products" arrow
// on a product's page can really go BACK (the list is then still where they left it, scrolled and searched) when they came
// from the list, and go to the list otherwise (a shared link, a fresh tab). The browser's document.referrer can't tell:
// it only knows the page the visit STARTED from, not the pages moved through since. A plain variable is enough: it lives
// as long as the visitor stays in the site, and starts empty on a fresh load. Rendered once by the layout.
let previous: string | null = null;
let current: string | null = null;

export const previousPath = () => previous;
// True once any page has been shown in this load of the site: false on a fresh load or a refresh (the tracker only runs in the browser).
export const hasVisited = () => current !== null;

export default function PathTracker() {
  const pathname = usePathname();
  useEffect(() => {
    window.addEventListener("popstate", signalBack);
    return () => window.removeEventListener("popstate", signalBack);
  }, []);
  useEffect(() => {
    if (current !== pathname) {
      previous = current;
      current = pathname;
    }
  }, [pathname]);
  return null;
}

// "The visitor is going BACK in the history" (the browser's Back / Forward, or an arrow that does router.back()): the marketplace's lists then come back as they were
// (home/home-context.tsx), while any other way to a list shows a fresh one. Kept here, not in the marketplace's shell, because that is built again after a visit to a
// business's page and Back, and must not lose it. A signal counts for two seconds (the path changes at once after it); a popstate that does not change the path leaves nothing behind.
let backAt = 0;
export const signalBack = () => {
  backAt = Date.now();
};
/** True once for a path change that came with a Back / Forward. */
export const wasBack = () => {
  const yes = Date.now() - backAt < 2000;
  backAt = 0;
  return yes;
};
/** The same, without using it up (to look at it more than once). */
export const recentBack = () => Date.now() - backAt < 2000;
