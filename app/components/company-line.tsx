import Link from "next/link";
import PlaceholderPicture from "@/app/components/placeholder-picture";
import type { CompanyLogo } from "@/app/home/company-info";
import { LOGO_ROW_MAX_HEIGHT, LOGO_ROW_MAX_WIDTH, logoDisplaySize } from "@/lib/logo";

// Whose product (or service) this is, in the marketplace (2026-10-10 phone, 2026-10-11 every size, the owner): a slim line under the name and the price, on a product's or service's own page
// (item-detail.tsx) and in every row of the Services list (home-services.tsx; 2026-10-11, "set company name below service name and price"): a small logo (28px high on phone and tablet; from
// 1120px the logo is the size the desktop card had, fitted in 100 x 58 like everywhere else on desktop: "only show bigger logo on desktop", then "set logo size on desktop as before"), the
// business's name (semibold) and its city (grey) and a chevron, all one link to the business's own page (44px high to tap, no borders, so it does not compete with the name and the price).
// There is no "Visit" button and no "Sold by" caption: the line is the button. The side padding is the page's, not this link's; on desktop it is at most as wide as the description (560px), so the
// chevron stays near the name. (The bigger card with the kind of business, home/company-info.tsx, is now only the Companies page's.)
export function CompanyLine({ slug, name, city, logo }: { slug: string; name: string; city: string | null; logo: CompanyLogo | null }) {
  // Two sizes of the same logo, as CSS variables so the screen's width picks one (no script, nothing jumps): up to 72 x 28, and from 1120px up to 100 x 58 (LOGO_ROW_*, what the desktop card used; the line grows to 58px with it).
  const small = logo ? logoDisplaySize(logo.width, logo.height, 72, 28) : null;
  const big = logo ? logoDisplaySize(logo.width, logo.height, LOGO_ROW_MAX_WIDTH, LOGO_ROW_MAX_HEIGHT) : null;
  return (
    <Link href={`/${slug}`} aria-label={`${name}: all its products and services`} className="flex min-h-11 items-center gap-2.5 min-[1120px]:max-w-140">
      {logo && small && big && (
        <PlaceholderPicture
          avif={logo.avif}
          webp={logo.webp}
          alt=""
          placeholder={logo.placeholder}
          className="h-(--sh) w-(--sw) shrink-0 min-[1120px]:h-(--bh) min-[1120px]:w-(--bw)"
          style={{ "--sw": `${small.width}px`, "--sh": `${small.height}px`, "--bw": `${big.width}px`, "--bh": `${big.height}px` } as React.CSSProperties}
        />
      )}
      <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
        <span className="truncate text-[15px] leading-5 font-semibold text-black">{name}</span>
        {city && <span className="shrink-0 text-[14px] leading-5 text-[#636363]">· {city}</span>}
      </span>
      <svg aria-hidden viewBox="0 0 10 16" className="h-4 w-2.5 shrink-0 text-black/50" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1.5 1.5L8 8l-6.5 6.5" />
      </svg>
    </Link>
  );
}
