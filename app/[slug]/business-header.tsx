import Link from "next/link";
import { LOGO_FIT_CLASS, logoDisplaySize } from "@/lib/logo";
import type { PublicBusiness } from "@/lib/public-site";
import HeaderLinks from "./header-links";
import HeaderSearch from "./header-search";
import VisitorIcon from "./visitor-icon";

// The top bar, in the three sizes of the designs. It stays at the top while the page scrolls.
//  - Phone (under 768px, Figma 2063:8870): logo row (69px), then the search line. The pages are in the bottom bar.
//  - Tablet (768px up, Figma 2022:236): logo row, then a row of page links, then the search line (centered, 390px).
//  - Desktop (1120px up, Figma 1424:453): one row (69px): logo and name, the page links and a search box in the middle, and
//    "← sqrtx" and the account icon at the right. 1120px is where the bar still fits with a scrollbar:
//    303 (logo + name) + 534 (links + search) + 196 (right side).
// The logo is never cropped: it is fitted inside 110 x 68 (the API stores it at twice the size, see lib/logo.ts), the
// same way the registration page's own logo preview is, and against the left edge of the screen like the designs. Its
// OWN box only reserves the 68px height (so the bar's height never depends on what shape the logo is, see below): not
// a fixed 110px width too, or a narrow logo would leave a big gap before the name that a wide logo would not, making
// the space between the logo and the name look different from one business to the next (found by the owner,
// 2026-09-29). The name keeps its place either way: gap-3.25 is between the logo's own actual edge and the name now,
// not the edge of an oversized box some logos never reach.
// The account icon is a picture for visitors (they can't have accounts yet) and a link to the account page for someone
// who is logged in (see visitor-icon.tsx).
export default function BusinessHeader({ business, slug, categoryName }: { business: PublicBusiness; slug: string; categoryName: string | null }) {
  const { logo, provides } = business;
  return (
    <header className="sticky top-0 z-30 bg-white">
      <div className="flex items-center border-b border-[#b8b8b8]">
        <div className="flex min-w-0 flex-1 items-center gap-3.25 min-[1120px]:w-75.75 min-[1120px]:flex-none">
          <div className="flex h-17 shrink-0 items-center justify-start">
            {logo && (
              <picture className="contents">
                <source srcSet={logo.avif} type="image/avif" />
                {/* alt="" because the name is written right next to it */}
                <img
                  src={logo.webp}
                  alt=""
                  width={logo.width ?? undefined}
                  height={logo.height ?? undefined}
                  style={logoDisplaySize(logo.width, logo.height) ?? undefined}
                  className={LOGO_FIT_CLASS}
                />
              </picture>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 py-2 min-[1120px]:w-45 min-[1120px]:flex-none">
            <h1 className="text-[16px] leading-[1.2] font-bold wrap-break-word">{business.company_name}</h1>
            {categoryName && <p className="text-[13px] leading-[1.2] font-bold text-[#888] wrap-break-word">{categoryName}</p>}
          </div>
        </div>

        {/* Desktop only: the page links and the search box, centered between the logo and the right side. */}
        <div className="hidden min-w-0 flex-1 items-center justify-center gap-4.25 min-[1120px]:flex">
          <HeaderLinks slug={slug} provides={provides} variant="desktop" />
          <HeaderSearch variant="desktop" />
        </div>

        <div className="flex shrink-0 items-center gap-4.5 pr-2.5 min-[1120px]:pr-4.25 min-[1120px]:pl-6.25">
          <Link href="/" className="hidden h-9 items-center px-4.75 text-[14px] leading-[17px] font-medium tracking-[0.98px] text-black min-[1120px]:flex">
            ← sqrtx
          </Link>
          <VisitorIcon />
        </div>
      </div>

      {/* Tablet only: the page links get their own row (54px). */}
      {/* max-[1120px] means "narrower than 1120px" (Tailwind's max-* is exclusive), the mirror of min-[1120px] (1120px and up). */}
      <div className="hidden md:max-[1120px]:block">
        <HeaderLinks slug={slug} provides={provides} variant="tablet" />
      </div>

      {/* Phone and tablet: the search line. 20px above and below on the phone; on the tablet only below, centered and at most 390px wide. */}
      <div className="py-5 md:pt-0 min-[1120px]:hidden">
        <div className="mx-auto max-w-97.5 px-4 md:px-5">
          <HeaderSearch variant="bar" />
        </div>
      </div>
    </header>
  );
}
