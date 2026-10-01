import Link from "next/link";
import VisitorIcon from "@/app/[slug]/visitor-icon";
import CountryPicker from "./country-picker";
import { HomeLinks } from "./home-nav";
import HomeSearch, { HomeSearchLine } from "./home-search";

// The top of the home page, in the three looks of the designs (Figma "sqrtx phone nav" 2167, "sqrtx tablet nav", "sqrtx Desktop new"):
//  - phone: a black bar, 68px (its bottom line included), "sqrtx" at the left (a white square where the sign will be, as in the design) and
//    the account icon at the right (white, on the black); under it the search line, 20px above and below it. The pages and the country are in
//    the bottom bar (home-nav.tsx).
//  - tablet (768px up): the same bar, then a black row of 54px with the four links and the country picker, centered, then the search line
//    (centered, at most 390px).
//  - desktop (1120px up, the same width the business pages' bar switches at): ONE black bar of 67px: the logo, then in the middle the four
//    links, the search box (white, with a grey button) and the country, and the account icon at the right.
// Stays on screen while the page scrolls. No room is kept for a scrollbar (the page has data-site-header, see globals.css): the black goes
// all the way across the window, and what is in the bars is padded by the scrollbar's width instead (keep-width), like the business pages.
export default function HomeHeader({ countries }: { countries: readonly string[] }) {
  return (
    <header data-site-header className="sticky top-0 z-30 bg-white">
      <div className="border-b border-[#d4d4d4] bg-black min-[1120px]:border-b-0">
        <div className="keep-width mx-auto flex h-16.75 w-full max-w-550 items-center justify-between">
          <Link href="/" className="flex shrink-0 items-center gap-1.25 px-4.75 text-white">
            <span aria-hidden className="size-5 bg-white" />
            <span className="text-[16px] leading-[1.21] font-bold">sqrtx</span>
          </Link>

          {/* Desktop only: the links, the search and the country share the middle of the bar. */}
          <div className="hidden min-w-0 flex-1 items-center justify-center gap-7 min-[1120px]:flex">
            <HomeLinks variant="desktop" />
            <HomeSearch variant="desktop" />
            <CountryPicker countries={countries} variant="desktop" />
          </div>

          <div className="flex shrink-0 items-center pr-2.5">
            <VisitorIcon light />
          </div>
        </div>
      </div>

      {/* Tablet only: the links and the country get their own black row (54px). */}
      <div className="hidden bg-black md:max-[1120px]:block">
        <div className="keep-width mx-auto flex h-13.5 max-w-550 items-center justify-center gap-5.75 px-4.25">
          <HomeLinks variant="tablet" />
          <CountryPicker countries={countries} variant="tablet" />
        </div>
      </div>

      {/* Phone and tablet: the search line, 20px above and below it (not on the About page). */}
      <HomeSearchLine />
    </header>
  );
}
