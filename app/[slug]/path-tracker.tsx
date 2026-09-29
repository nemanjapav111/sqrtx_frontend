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

export default function PathTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (current !== pathname) {
      previous = current;
      current = pathname;
    }
  }, [pathname]);
  return null;
}
