"use client";

import { usePathname } from "next/navigation";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { hasVisited, recentBack } from "@/app/[lang]/[slug]/path-tracker";
import { BACK_NOTE, LIST_KEY_PREFIX, RESTORING_ATTRIBUTE } from "@/lib/list-restore-keys";

// Putting a list (products, services, companies; the marketplace's or a business's) back as the visitor left it, when they come back to it from a product's, a service's or a business's page.
//
// What is kept, and where:
//  - The lists keep what they show (the pages loaded, the category, the search...) in a variable of the page's shell (`memory` in home-context.tsx / search-context.tsx). It lives as long as the
//    visitor stays inside the site, and is gone after a FULL page load (a reload, or a product's page that the browser opened with a full load instead of a move inside the site).
//  - Clicking a card also writes the list and its scroll position to sessionStorage (`remember` below), which survives a full load. The scroll position is only kept there.
//
// Where a list can be drawn from, when the visitor comes back to it:
//  1. From `memory`          (a move inside the site; the list passes `inMemory`): the list starts from it, and this hook puts the scroll position back before the first paint.
//  2. From sessionStorage    (a move inside the site, after a full load emptied `memory`): `start` is the state to begin with, so the first page of the list is never on screen, then the scroll.
//  3. From sessionStorage    (the server's page is hydrated, after Back into a freshly loaded page): the server's HTML has the first page, so it is replaced right after hydration (`apply`), then the scroll.
//
// "Coming back" is: the browser's Back / Forward (a full load of the list: the page's navigation type; a move inside the site: path-tracker.tsx's popstate signal), or the back arrow of a
// product's page, which is a link and leaves a note (`BACK_NOTE`, lib/list-restore-keys.ts, back-to-products.tsx) when it is used after a full load (when the site does not know where the visitor came from).
// Anything else (the logo, a menu link) shows a fresh list.


interface Stored<S> {
  y: number; // the scroll position when the card was clicked
  path: string; // the address of the list
  state: S;
}
const storageKey = (name: string) => `${LIST_KEY_PREFIX}${name}`;
/** The page may be hidden until the list is back (HIDE_UNTIL_RESTORED_SCRIPT in lib/list-restore-keys.ts): show it. */
const reveal = () => document.documentElement.removeAttribute(RESTORING_ATTRIBUTE);

/** True when this list is being drawn because the visitor is going back to it. `hydrating`: the page is a freshly loaded one (the note and the navigation type tell), else a move inside the site. */
function isComingBack(hydrating: boolean, path: string): boolean {
  const note = sessionStorage.getItem(BACK_NOTE) === path;
  sessionStorage.removeItem(BACK_NOTE); // used up
  const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return note || (hydrating ? entry?.type === "back_forward" : recentBack());
}

/**
 * What `remember` wrote for this list, if the visitor is coming back to it (else null). Call once when the list is first drawn: it uses up the back arrow's note.
 * `path` is the address of the list's page, from the router (usePathname), NOT location.pathname: while a page is drawn for a move inside the site the browser's address is still the old one
 * (the router changes it when the page is shown), so reading it then would compare with the product's page.
 */
function readStored<S>(name: string, hydrating: boolean, path: string): Stored<S> | null {
  try {
    if (!isComingBack(hydrating, path)) return null;
    const raw = sessionStorage.getItem(storageKey(name));
    if (!raw) return null;
    const stored = JSON.parse(raw) as Stored<S>;
    return stored.path === path ? stored : null;
  } catch {
    return null; // no storage, or something unreadable: the list simply starts again
  }
}

/** Puts the scroll position back: at once, and again just before the next paint (the router scrolls the new page to its top after the list's own layout effect). */
function scrollBackTo(y: number) {
  window.scrollTo(0, y);
  requestAnimationFrame(() => window.scrollTo(0, y));
}

export interface ListRestore<S> {
  /** The state to start the list from, when it was kept in sessionStorage and this is a move inside the site (case 2); else null. Use it in the first render's initial state. */
  start: S | null;
  /** Writes the list's state and the scroll position: call when a card is clicked (the list leaves the screen). */
  remember: (state: S) => void;
  /** True once, right after the list was put back from sessionStorage (case 2 or 3): the quiet "ask for a fresh first page" of a list that does that must be skipped, it would replace the list. */
  consumeRestored: () => boolean;
}

/**
 * @param name     what the list is called in storage ("products", "business-services"...)
 * @param inMemory the shell's memory had the list (case 1)
 * @param accepts  whether a kept state is what the list wants now (the same search, category, country...): a state that is not is ignored
 * @param apply    puts a kept state into the list (case 3)
 */
export function useListRestore<S>({ name, inMemory, accepts, apply }: { name: string; inMemory: boolean; accepts: (state: S) => boolean; apply: (state: S) => void }): ListRestore<S> {
  const path = usePathname();
  // Case 2, decided once, in the first render (never while hydrating: the server's page has no storage, so the browser's first render must match it).
  const [stored] = useState(() => {
    if (inMemory || typeof window === "undefined" || !hasVisited()) return null;
    const found = readStored<S>(name, false, path);
    return found && accepts(found.state) ? found : null;
  });

  const restored = useRef(stored !== null);
  const [lateY, setLateY] = useState<number | null>(null);

  // Once, when the list is first drawn, before the first paint. (The scroll position and, in case 3, the state can only be put back after the list is on screen: hence the state updates.)
  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    if (stored) {
      setLateY(stored.y); // case 2: already drawn as it was left, only the scroll position is wanted
      return;
    }
    if (inMemory) {
      const kept = readStored<S>(name, false, path); // case 1: the list came from memory; only the scroll position is wanted
      if (kept) setLateY(kept.y);
      return;
    }
    if (hasVisited()) return; // a move inside the site that is not a way back
    const kept = readStored<S>(name, true, path); // case 3: hydrating
    if (!kept || !accepts(kept.state)) {
      reveal();
      return;
    }
    restored.current = true;
    apply(kept.state);
    setLateY(kept.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the list is first drawn
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // The scroll position, in a commit of its own that follows the one that drew the list: the router scrolls a page it has just navigated to (a link, like the back arrow) to its top in the first
  // commit, after the list's own layout effect, so scrolling there would be undone. (Case 3 needs this anyway: its state is applied first.)
  useLayoutEffect(() => {
    if (lateY === null) return;
    scrollBackTo(lateY);
    reveal();
    setLateY(null); // eslint-disable-line react-hooks/set-state-in-effect -- done once
  }, [lateY]);

  const remember = useCallback(
    (state: S) => {
      try {
        sessionStorage.setItem(storageKey(name), JSON.stringify({ y: window.scrollY, path: location.pathname, state } satisfies Stored<S>));
      } catch {
        // storage full or blocked: coming back still works inside the site
      }
    },
    [name],
  );

  const consumeRestored = useCallback(() => {
    const was = restored.current;
    restored.current = false;
    return was;
  }, []);

  return { start: stored?.state ?? null, remember, consumeRestored };
}
