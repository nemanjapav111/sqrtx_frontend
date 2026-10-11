"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { aboutIcon, backIcon, contactIcon, productsIcon, servicesIcon } from "@/app/components/bar-icons";
import { currentTab, tabsFor, type TabKey } from "./tabs";

// The bottom bar of the PHONE design (Figma "footer_links", 2015:215): equal cells in a bar fixed to the
// bottom of the screen (44px in the design, 58px since 2026-10-08, see TAB below). The page you are on is the marked cell. From 768px up it is not shown: the tablet and desktop
// designs have the same links in the top bar instead (header-links.tsx). All four pages exist (Products, Services, Contact,
// About); a link to a page the business does not have leads to the "not found" page. "← sqrtx" is the way back to sqrtx itself.
// The icons are the marketplace bar's (components/bar-icons.tsx, 2026-10-10, the owner): a grid, a bell, an envelope and an "i" in a square, filled when they are the current
// page, and a chevron for the way back. Each is a function of "is this the current page".
export const ICONS: Record<TabKey, (on: boolean) => React.ReactNode> = {
  products: productsIcon,
  services: servicesIcon,
  contact: contactIcon,
  about: aboutIcon,
};

// The business's bar, and the marketplace's too (home/home-nav.tsx) (new look 2026-10-08, owner's choice from a mock-up): 58px high (it was 44), thinner 22px icons (they were 16px, 2.1 thick) with
// 12px labels (they were 11px), and the page you are on is BLACK with a 2px black line on the top edge of its cell (it was a dark grey block with white
// text), the others grey (#6b7280). The last cell, the way back to sqrtx, is a chevron over "sqrtx" like the others. The line over the bar is the light
// grey of the rows. The layout's bottom padding (layout.tsx) is 58px + this line.
export const TAB =
  "relative flex h-14.5 flex-1 flex-col items-center justify-center gap-1 text-[12px] leading-[17px] [&_svg]:size-5.5 [&_svg]:[stroke-width:1.6]";
export const TAB_ON = "font-semibold text-black before:absolute before:inset-x-[18%] before:-top-px before:h-0.5 before:bg-black";
export const TAB_OFF = "font-medium text-[#6b7280]";

export default function BusinessFooter({ slug, provides }: { slug: string; provides: "products" | "services" | "both" }) {
  const current = currentTab(usePathname(), slug, provides);
  const base = `/${slug.toLowerCase()}`;

  return (
    <nav
      aria-label="Pages"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e5e7eb] bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="flex">
        {tabsFor(provides).map((tab) => (
          <Link
            key={tab.key}
            href={base + tab.path}
            aria-current={current === tab.key ? "page" : undefined}
            className={`${TAB} ${current === tab.key ? TAB_ON : TAB_OFF}`}
          >
            {ICONS[tab.key](current === tab.key)}
            {tab.label}
          </Link>
        ))}
        <Link href="/" aria-label="Back to sqrtx" className={`${TAB} ${TAB_OFF}`}>
          {backIcon}
          sqrtx
        </Link>
      </div>
    </nav>
  );
}
