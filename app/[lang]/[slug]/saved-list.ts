import { recentBack } from "./path-tracker";

// A list (the marketplace's products, a business's products) is kept in memory while the visitor moves around the site (home-context.tsx, search-context.tsx), but a product's page that is slow
// to build can be opened by a full page load, which forgets the memory, and Back would then draw the first page of the list at the top. So when a card is clicked the list (pages loaded, filter,
// scroll position) is also written to sessionStorage (`rememberList`), and a list drawn afterwards by Back / Forward or by the back arrow of a product's page (back-to-products.tsx leaves
// the note "sqrtx:back-to") is put back from it (`takeSavedList`).
export interface SavedList<T> {
  y: number;
  path: string;
  data: T;
}

export function rememberList<T>(name: string, data: T) {
  try {
    sessionStorage.setItem(`sqrtx:list:${name}`, JSON.stringify({ y: window.scrollY, path: location.pathname, data } satisfies SavedList<T>));
  } catch {
    // storage full or blocked: Back still works inside the site
  }
}

/** What `rememberList` wrote, when this list is being drawn by a way back to it (else null). Call once, when the list is first drawn. */
export function takeSavedList<T>(name: string): SavedList<T> | null {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const arrow = sessionStorage.getItem("sqrtx:back-to") === location.pathname;
    sessionStorage.removeItem("sqrtx:back-to");
    const raw = sessionStorage.getItem(`sqrtx:list:${name}`);
    if ((nav?.type !== "back_forward" && !arrow) || !raw) return null;
    const saved = JSON.parse(raw) as SavedList<T>;
    return saved.path === location.pathname ? saved : null;
  } catch {
    return null;
  }
}

/**
 * The list is drawn again from the site's own memory (no full load) by a way back (Back / Forward or a product page's back arrow, which signal it: path-tracker.tsx): the scroll position it was left
 * at, to be put back before the first paint. Without it the page is first drawn at the top, or wherever the short page before it ended, and the browser's own restore moves it a moment later, in view.
 */
export function savedScrollY(name: string): number | null {
  try {
    if (!recentBack()) return null;
    const raw = sessionStorage.getItem(`sqrtx:list:${name}`);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedList<unknown>;
    return saved.path === location.pathname ? saved.y : null;
  } catch {
    return null;
  }
}
