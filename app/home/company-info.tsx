import Link from "next/link";
import PlaceholderPicture from "@/app/components/placeholder-picture";
import { LOGO_FIT_CLASS, logoDisplaySize } from "@/lib/logo";

// Whose it is, in the marketplace: the business's logo exactly as it is on its own page (business-header.tsx): fitted inside 110 x 68, never
// cropped or enlarged, no frame, at the left edge of the content, and 13px from it, centered against it,
// the business's name (semibold 16) and under it its kind of business and its city on one line (13, grey). The whole block is ONE link to the
// business's own page. Used on a product's or a service's own page and on the Companies page (`card`: it also has a chevron at its end, which is
// what says "tap to open it"; this replaced the design's separate "Visit >" text link under the block, which looked like a stray word) and in
// every row of the Services page (no chevron). The parts the page has no value for are left out (a logo is required at registration, so there is always one).
export interface CompanyLogo {
  avif: string;
  webp: string;
  width: number | null;
  height: number | null;
  placeholder: string | null;
}

export default function CompanyInfo({
  slug,
  name,
  typeName,
  city,
  logo,
  card = false,
  className = "",
}: {
  slug: string; // the business's address (sqrtx.co/<slug>)
  name: string;
  typeName: string | null;
  city: string | null;
  logo: CompanyLogo | null;
  card?: boolean; // add the chevron at the end and let the block take the room it is given (up to 420px)
  className?: string;
}) {
  const size = logo ? logoDisplaySize(logo.width, logo.height) : null;
  const place = [typeName, city].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/${slug}`}
      aria-label={`${name}: all its products and services`}
      className={`flex items-center gap-3.25 ${card ? "w-full max-w-105" : "w-fit max-w-full"} ${className}`}
    >
      <span className="flex h-17 shrink-0 items-center justify-start">
        {logo && size && <PlaceholderPicture avif={logo.avif} webp={logo.webp} alt="" placeholder={logo.placeholder} className="shrink-0" style={size} />}
        {logo && !size && (
          <picture className="contents">
            <source srcSet={logo.avif} type="image/avif" />
            <img src={logo.webp} alt="" className={LOGO_FIT_CLASS} />
          </picture>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.75">
        <span className="line-clamp-2 text-[16px] leading-5 font-semibold text-black wrap-break-word">{name}</span>
        {place && <span className="line-clamp-2 text-[13px] leading-4.5 text-[#636363] wrap-break-word">{place}</span>}
      </span>
      {card && (
        <svg aria-hidden viewBox="0 0 10 16" className="h-4 w-2.5 shrink-0 text-black/50" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1.5 1.5L8 8l-6.5 6.5" />
        </svg>
      )}
    </Link>
  );
}
