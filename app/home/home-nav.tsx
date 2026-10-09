"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, ICONS, TAB, TAB_OFF, TAB_ON } from "@/app/[slug]/business-footer";
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

// "Companies" has no icon in the design (a plain square stands in); a small building, drawn like the other three.
const COMPANIES_ICON = (
  <Icon>
    <path d="M4 22V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v18" />
    <path d="M15 9h4a1 1 0 0 1 1 1v12" />
    <path d="M2 22h20" />
    <path d="M8 7h2M8 11h2M8 15h2" />
  </Icon>
);
const PAGE_ICONS = { products: ICONS.products, services: ICONS.services, companies: COMPANIES_ICON, about: ICONS.about };

/**
 * The bottom bar of the PHONE design (Figma "sqrtx footer_links"): the four pages and the location picker, five equal cells. New look 2026-10-08, the same as
 * the business pages' bar (business-footer.tsx): 58px high, thin 22px icons, the current page black with a line on top of its cell, the others grey.
 */
export function HomeFooter({ countries }: { countries: readonly string[] }) {
  const current = useCurrent();
  return (
    <nav aria-label="Pages" className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e5e7eb] bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex">
        {PAGES.map((page) => (
          <Link
            key={page.key}
            href={page.href}
            prefetch={page.exists}
            aria-current={page.key === current ? "page" : undefined}
            className={`${TAB} ${page.key === current ? TAB_ON : TAB_OFF}`}
          >
            {PAGE_ICONS[page.key]}
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
 * a mock-up, the same as the business pages' links): Inter medium 15px, the current page white with a thin (1.5px) underline and the others grey (#a3a3a3,
 * white under the pointer), 24px apart (28px from 1280px).
 */
export function HomeLinks({ variant }: { variant: "tablet" | "desktop" }) {
  const desktop = variant === "desktop";
  const current = useCurrent();
  return (
    <nav aria-label="Pages" className={desktop ? "flex items-center gap-6 py-1.25 pl-4.25 min-[1280px]:gap-7" : "flex items-center gap-5.75"}>
      {PAGES.map((page) => (
        <Link
          key={page.key}
          href={page.href}
          prefetch={page.exists}
          aria-current={page.key === current ? "page" : undefined}
          className={`flex items-center text-[15px] leading-[17px] font-medium ${desktop ? "" : "h-11"} ${
            page.key === current ? "text-white underline decoration-[1.5px] underline-offset-6" : "text-[#a3a3a3] hover:text-white focus-visible:text-white"
          }`}
        >
          {page.label}
        </Link>
      ))}
    </nav>
  );
}
