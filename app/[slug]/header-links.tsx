"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS, currentTab } from "./tabs";

// The page links of the top bar on tablet and desktop (the phone has them in the bottom bar instead).
//  - "tablet" (Figma 2015:206): its own row under the logo, centered, followed by "← sqrtx".
//  - "desktop" (Figma 1424:463): the four links in the middle of the bar; "← sqrtx" is a separate button at the right
//    (see business-header.tsx).
// The designs show no "you are here" marking on these links (every one is plain black), so none is drawn: the current
// page is only announced to screen readers (aria-current). Services, Contact and About lead to a 404 for now.
export default function HeaderLinks({ slug, variant }: { slug: string; variant: "tablet" | "desktop" }) {
  const current = currentTab(usePathname(), slug);
  const base = `/${slug.toLowerCase()}`;
  const desktop = variant === "desktop";

  return (
    <nav
      aria-label="Pages"
      className={desktop ? "flex items-center gap-4.25 py-1.25 pl-4.25" : "flex items-center justify-center gap-5.75 py-1.25"}
    >
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={base + tab.path}
          aria-current={current === tab.key ? "page" : undefined}
          className={`flex items-center text-[14px] leading-[17px] text-black ${desktop ? "font-bold" : "h-11 font-semibold"}`}
        >
          {tab.label}
        </Link>
      ))}
      {!desktop && (
        <Link href="/" className="flex h-11 items-center px-2.5 text-[14px] leading-[17px] font-medium tracking-[0.98px] text-black">
          ← sqrtx
        </Link>
      )}
    </nav>
  );
}
