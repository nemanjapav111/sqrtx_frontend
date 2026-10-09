"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BackToSqrtx from "./back-to-sqrtx";
import { currentTab, tabsFor } from "./tabs";

// The page links of the top bar on tablet and desktop (the phone has them in the bottom bar instead).
//  - "tablet" (Figma 2015:206): its own row under the logo, centered, followed by "← sqrtx".
//  - "desktop" (Figma 1424:463): the four links in the middle of the bar; "← sqrtx" is a separate button, in the window's far left corner (business-header.tsx)
//    (see business-header.tsx).
// The designs show no "you are here" marking on these links (every one is plain black); tried that as-is, but with
// four identical-looking links it wasn't clear which page you were on, so the current one is underlined too, on top
// of aria-current for screen readers. underline-offset, not the plain CSS default: sitting right against
// the letters read as too tight to notice at a glance.
// New look 2026-10-08 (owner's choice from a mock-up): 15px medium (they were 14px bold / semibold), the current page black with a thin (1.5px)
// underline and the others grey (#6b7280, black under the pointer), 34px apart on desktop.
export default function HeaderLinks({
  slug,
  provides,
  variant,
}: {
  slug: string;
  provides: "products" | "services" | "both";
  variant: "tablet" | "desktop";
}) {
  const current = currentTab(usePathname(), slug, provides);
  const base = `/${slug.toLowerCase()}`;
  const desktop = variant === "desktop";

  return (
    <nav
      aria-label="Pages"
      className={desktop ? "flex items-center gap-6 py-1.25 pl-4.25 min-[1280px]:gap-8.5" : "flex items-center justify-center gap-5.75 py-1.25"}
    >
      {tabsFor(provides).map((tab) => (
        <Link
          key={tab.key}
          href={base + tab.path}
          aria-current={current === tab.key ? "page" : undefined}
          className={`flex items-center text-[15px] leading-[17px] font-medium ${desktop ? "" : "h-11"} ${
            current === tab.key ? "text-black underline decoration-[1.5px] underline-offset-6" : "text-[#6b7280] hover:text-black focus-visible:text-black"
          }`}
        >
          {tab.label}
        </Link>
      ))}
      {!desktop && (
        <Link href="/" className="flex h-11 items-center px-2.5 text-[14px] leading-[17px] font-medium tracking-[0.98px] text-black">
          <BackToSqrtx />
        </Link>
      )}
    </nav>
  );
}
