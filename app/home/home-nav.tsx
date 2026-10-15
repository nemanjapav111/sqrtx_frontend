"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TAB, TAB_OFF, TAB_ON } from "@/app/[slug]/business-footer";
import { aboutIcon, companiesIcon, productsIcon, servicesIcon } from "@/app/components/bar-icons";
import LocationPicker from "./location-picker";

// The pages of the site and the ways to them: Products (the home page), Services, Companies and About. (The same words are reserved: no
// business can take them as its address.) `exists` is for a page that is not built yet: its link is not fetched ahead of time.
const PAGES = [
  { key: "products", label: "Products", href: "/", exists: true },
  { key: "services", label: "Services", href: "/services", exists: true },
  { key: "companies", label: "Companies", href: "/companies", exists: true },
  { key: "about", label: "About", href: "/about", exists: true },
] as const;
/** The page the visitor is on, from the address: a service's own page (/service/...) counts as Services, anything not listed as Products. */
const useCurrent = () => {
  const path = usePathname();
  if (path === "/services" || path.startsWith("/service/")) return "services";
  if (path === "/companies") return "companies";
  if (path === "/about") return "about";
  return "products";
};
// A page that does not exist yet is not fetched ahead of time (a link in view is, by default): that would be a request for a "not found" for every visitor.

// The phone bar's icons are shared with the business pages' bar: components/bar-icons.tsx (the location's target is in location-picker.tsx).
const PAGE_ICONS = { products: productsIcon, services: servicesIcon, companies: companiesIcon, about: aboutIcon };

/**
 * The bottom bar of the PHONE design (Figma "sqrtx footer_links"): the four pages and the location picker, five equal cells. New look 2026-10-08, the same as
 * the business pages' bar (business-footer.tsx): 58px high, thin 22px icons, the current page black with a line on top of its cell, the others grey.
 */
export function HomeFooter({ countries }: { countries: readonly string[] }) {
  const current = useCurrent();
  return (
    <nav aria-label="Pages" className="fixed inset-x-0 bottom-0 z-30 transform-gpu border-t border-[#e5e7eb] bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex">
        {PAGES.map((page) => (
          <Link
            key={page.key}
            href={page.href}
            prefetch={page.exists}
            aria-current={page.key === current ? "page" : undefined}
            className={`${TAB} tracking-[0.02em] ${page.key === current ? TAB_ON : TAB_OFF}`}
          >
            {PAGE_ICONS[page.key](page.key === current)}
            {page.label}
          </Link>
        ))}
        <LocationPicker countries={countries} variant="bar" />
      </div>
    </nav>
  );
}

/**
 * The links of the top bar (the phone has them in the bottom bar): "tablet" (Figma "sqrtx links": 44px high, 23px apart, in their own row,
 * see home-header.tsx) and "desktop" (17px in from the left, exactly like a business's links, header-links.tsx). New look 2026-10-08 (owner's choice from
 * a mock-up, the same as the business pages' links): Inter medium 15px (14px in the desktop bar since 2026-10-09, when the bar got smaller), the current page white with a thin (1.5px)
 * underline and the others grey (#a3a3a3, white under the pointer), 20px apart on desktop (24px from 1280px), 23px on the tablet.
 */
export function HomeLinks({ variant }: { variant: "tablet" | "desktop" }) {
  const desktop = variant === "desktop";
  const current = useCurrent();
  return (
    <nav aria-label="Pages" className={desktop ? "flex items-center gap-5 py-1.25 pl-4.25 min-[1280px]:gap-6" : "flex items-center gap-5.75"}>
      {PAGES.map((page) => (
        <Link
          key={page.key}
          href={page.href}
          prefetch={page.exists}
          aria-current={page.key === current ? "page" : undefined}
          className={`flex items-center font-medium ${desktop ? "text-[14px] leading-4" : "h-11 text-[15px] leading-[17px]"} ${
            page.key === current ? "text-white underline decoration-[1.5px] underline-offset-6" : "text-[#a3a3a3] hover:text-white focus-visible:text-white"
          }`}
        >
          {page.label}
        </Link>
      ))}
    </nav>
  );
}
