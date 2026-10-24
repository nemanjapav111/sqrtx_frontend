"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { parseAddress } from "@/lib/i18n";
import { hasVisited, recentBack } from "./path-tracker";

// Moving to another page of the business (Products, Services, Contact, About) starts it at its top. Next.js scrolls there itself only when it finds a first
// element of the new page to scroll to, which it does not always on a business's pages: the page was left at the old page's scroll position, partly down, and
// on a phone the start of the new page (the business's intro on Products) was hidden under the top bar (found on an iPhone, 2026-10-24). Not after Back / Forward
// (the browser and the list restore put the page where the visitor left it), not for a product's or service's page (drawn above its list, which must not move:
// item-detail.tsx does its own scrolling) and not on a fresh load (nothing to compare with). Arriving at a business from another page of the site (a card, or a product's "company" link on the marketplace) is a move too:
// the layout is new then, but the page before it was scrolled, and the business's intro was left above the screen (found on Android Chrome, 2026-10-24). Rendered once by the layout.
const TAB_PAGE = /^\/[^/]+(\/(services|contact|about))?\/?$/;

export default function ScrollTopOnTab() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);
  useLayoutEffect(() => {
    const before = last.current;
    last.current = pathname;
    if (before === pathname || (before === null && !hasVisited())) return; // same page, or a fresh load
    if (!TAB_PAGE.test(parseAddress(pathname).rest)) return;
    if (recentBack()) return;
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
