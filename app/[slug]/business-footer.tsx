"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { currentTab, tabsFor, type TabKey } from "./tabs";

// The bottom bar of the PHONE design (Figma "footer_links", 2015:215): equal cells in a bar fixed to the
// bottom of the screen (44px in the design, 58px since 2026-10-08, see TAB below). The page you are on is the marked cell. From 768px up it is not shown: the tablet and desktop
// designs have the same links in the top bar instead (header-links.tsx). All four pages exist (Products, Services, Contact,
// About); a link to a page the business does not have leads to the "not found" page. "← sqrtx" is the way back to sqrtx itself.
export const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const ICONS: Record<TabKey, React.ReactNode> = {
  products: (
    <Icon>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </Icon>
  ),
  services: (
    <Icon>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </Icon>
  ),
  contact: (
    <Icon>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </Icon>
  ),
  about: (
    <Icon>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </Icon>
  ),
};

// The business's bar, and the marketplace's too (home/home-nav.tsx) (new look 2026-10-08, owner's choice from a mock-up): 58px high (it was 44), thinner 22px icons (they were 16px, 2.1 thick) with
// 12px labels (they were 11px), and the page you are on is BLACK with a 2px black line on the top edge of its cell (it was a dark grey block with white
// text), the others grey (#6b7280). The last cell, the way back to sqrtx, is an arrow over "sqrtx" like the others. The line over the bar is the light
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
            {ICONS[tab.key]}
            {tab.label}
          </Link>
        ))}
        <Link href="/" aria-label="Back to sqrtx" className={`${TAB} ${TAB_OFF}`}>
          <Icon>
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </Icon>
          sqrtx
        </Link>
      </div>
    </nav>
  );
}
