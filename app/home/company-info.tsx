import Link from "next/link";
import PlaceholderPicture from "@/app/components/placeholder-picture";
import ArrowIcon from "@/app/register/arrow-icon";
import { LOGO_FIT_CLASS, logoDisplaySize } from "@/lib/logo";

// Whose it is, in the marketplace (Figma "logo and company info"): the business's logo (110 x 68 at most, fitted inside, never cropped or
// enlarged, a link to its page), and beside it its name (Inter bold 16), its kind of business (bold 13, grey) and its place (a pin and the
// city, bold 13). Used on a product's or a service's own page (company-card.tsx, with a "Visit" button under it) and in every row of the
// Services page. The parts the page has no value for are left out.
export interface CompanyLogo {
  avif: string;
  webp: string;
  width: number | null;
  height: number | null;
  placeholder: string | null;
}

/** The "Visit" button under a company block (110 x 36, Inter semibold 16): to the business's own page. The design draws "Visit →" with a text arrow; it is the site's own thin arrow. */
export function VisitLink({ slug }: { slug: string }) {
  return (
    <Link href={`/${slug}`} className="flex h-9 w-27.5 items-center gap-1.5 py-2.5 text-[16px] leading-[1.21] font-semibold text-black">
      Visit
      <ArrowIcon className="h-3 w-3.5" strokeWidth={1.6} />
    </Link>
  );
}

export default function CompanyInfo({
  slug,
  name,
  typeName,
  city,
  logo,
  className = "",
}: {
  slug: string; // the business's address (sqrtx.co/<slug>)
  name: string;
  typeName: string | null;
  city: string | null;
  logo: CompanyLogo | null;
  className?: string;
}) {
  const size = logo ? logoDisplaySize(logo.width, logo.height) : null;
  return (
    <div className={`flex gap-2.5 ${className}`}>
      <Link href={`/${slug}`} aria-label={`${name}: all its products and services`} className="flex h-17 w-27.5 shrink-0 items-start justify-start">
        {logo && size && <PlaceholderPicture avif={logo.avif} webp={logo.webp} alt="" placeholder={logo.placeholder} className="shrink-0" style={size} />}
        {logo && !size && (
          <picture className="contents">
            <source srcSet={logo.avif} type="image/avif" />
            <img src={logo.webp} alt="" className={LOGO_FIT_CLASS} />
          </picture>
        )}
      </Link>
      <div className="flex min-w-0 flex-col gap-1 self-center">
        <p className="line-clamp-2 text-[16px] leading-[1.21] font-bold text-black wrap-break-word">{name}</p>
        {typeName && <p className="line-clamp-1 text-[13px] leading-[1.21] font-bold text-[#888] wrap-break-word">{typeName}</p>}
        {city && (
          <p className="flex items-center gap-0.5 text-[13px] leading-[1.21] font-bold text-black">
            <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="line-clamp-1 wrap-break-word">{city}</span>
          </p>
        )}
      </div>
    </div>
  );
}
