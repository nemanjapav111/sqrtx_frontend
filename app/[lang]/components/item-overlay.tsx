"use client";

import { useLayoutEffect, useState } from "react";

// A product's or a service's page drawn ABOVE the list it was opened from, instead of replacing it: the marketplace's (app/[lang]/(sqrtx)/@modal) and a
// business's own site (app/[lang]/[slug]/@modal), each with a (.)product and a (.)service route. The list stays on screen underneath, with its cards, pictures
// and scroll position untouched, so the back arrow only takes this away and nothing is drawn again (before, the list was thrown away and rebuilt on Back, and
// every picture started again from its blurred preview). A shared link, a reload or a new tab still gets the full page (the routes without the "(.)").
// It fills the window under the top bar (which is sticky, so its height is its bottom edge) and, on a phone, above the bottom bar, and scrolls on its own;
// `overscroll-contain` keeps the list behind from scrolling along. It does not lock the page, so no scrollbar appears or disappears and nothing moves.
export default function ItemOverlay({ children }: { children: React.ReactNode }) {
  const [top, setTop] = useState(0);
  useLayoutEffect(() => {
    const measure = () => setTop(document.querySelector("header[data-site-header]")?.getBoundingClientRect().bottom ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return (
    <div
      data-product-overlay
      style={{ top }}
      className="keep-width fixed inset-x-0 bottom-[calc(59px+env(safe-area-inset-bottom))] z-40 flex flex-col overflow-y-auto overscroll-contain bg-white md:bottom-0"
    >
      {children}
    </div>
  );
}
