"use client";

import { useEffect, useRef, useState } from "react";
import PlaceholderPicture from "@/app/components/placeholder-picture";
import ArrowIcon from "@/app/register/arrow-icon";
import { formatPrice } from "@/lib/price";
import type { PublicBusiness, PublicProductDetail } from "@/lib/public-site";
import BackToProducts from "../../back-to-products";

// A product's own page, in the three sizes of the designs (Figma 2108:344 phone 360 x 840, 1988:1874 tablet 768 x 909,
// 1560:134 desktop 1440 x 1024). The top bar is the site's own (the layout draws it); the back arrow to the products is
// in the search line on phone and tablet (header-search.tsx) and at the page's top left on desktop.
//  - Phone: name (20px medium) and price (22px bold) at the left, the photo in a 360 x 450 box (shown whole, never cropped),
//    the other photos as 80px squares (cropped to fill, three to a row), then the description and "View contact".
//  - Tablet (768px up): the same in one centered column, the photo across the whole width, name and price centered, the
//    small photos 90px in a row, the text under them (text 640px wide, the frame 680).
//  - Desktop (1120px up; the design is 1440 wide, 1120 is where the two columns still fit): the photos at the left with
//    "<" ">" arrows on the big photo, and at the right the name (32px bold), the price (20px bold), "View contact" and the
//    description (all 560px wide).
// The "View contact" button is smaller than the design's (36px high and 14px text instead of 42px and 16px, wording in
// lower case): the owner found the drawn one oversized.
// Where I chose (not in the designs):
//  - "View contact" comes AFTER the description on phone and tablet (the design's tablet has it before) and right under the
//    price on desktop (as designed): a reader finishes the text and then acts, except on desktop where the column is short
//    and the button stays in view.
//  - What "View contact" does: it opens the business's contact details in a box that floats under the button (there is no Contact page yet): phone,
//    email, address (a map link), hours and social pages, no name (it is in the top bar already).
//  - The chosen small photo has a thin black outline; the photo arrows go round (after the last comes the first) and only
//    show when there is more than one photo; a product with one photo has no small ones.
// Between the designs' widths it keeps its shape instead of stretching: the content never grows past 1440px and is centered,
// from 1120px the two columns keep the design's 740:680 proportions and the right column's name and left space shrink
// with the window, and on a tablet the photos stop at 900px.
// CSS gotcha (also in header-links.tsx): `md:` (768px up) and `min-[1120px]:` both match on a desktop and the md rule wins, so
// what only tablet needs is written `md:max-[1120px]:` (768 up to, not including, 1120).
export default function ProductDetail({
  product,
  business,
  slug,
}: {
  product: PublicProductDetail;
  business: PublicBusiness;
  slug: string;
}) {
  const images = [...product.images].sort((a, b) => a.sort_order - b.sort_order);
  const [selected, setSelected] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);
  const contactRef = useRef<HTMLDivElement>(null);
  // The contact box floats over the page, so it closes like the account menu does: a click outside it, or Escape.
  useEffect(() => {
    if (!contactOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (contactRef.current && !contactRef.current.contains(e.target as Node)) setContactOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContactOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [contactOpen]);
  const shown = images[selected] ?? images[0];
  // The photos whose big version is loaded before it is asked for, so choosing one shows it at once instead of after a
  // download: the two next to the shown one (also going round, as the arrows do), and any small photo the visitor's
  // pointer or finger is on (choosing one usually follows). Not all of them: a product can have 30 photos of 100 to 300 KB
  // and most visitors never look at more than a few.
  const [warm, setWarm] = useState<number[]>([]);
  const toLoad = new Set([...warm, (selected + 1) % images.length, (selected - 1 + images.length) % images.length]);
  toLoad.delete(selected);
  const step = (by: number) => setSelected((i) => (i + by + images.length) % images.length);

  return (
    <div className="flex w-full flex-1 flex-col">
      {/* The content is at most 1440px wide (the design's) and centered; everything of the page is placed against THIS box,
          so on a wider window nothing is left behind at the window's edge. */}
      <div className="relative mx-auto w-full max-w-360">
      {/* Desktop only (phone and tablet have the arrow in the search line). 20px from the content's edges, like the design;
          drawn with the site's own thin arrow instead of the design's bold "←" text character. */}
      <BackToProducts slug={slug} className="absolute top-5 left-5 z-10 hidden size-11 items-center justify-center min-[1120px]:flex">
        <ArrowIcon className="h-6 w-7 rotate-180" strokeWidth={1.6} />
      </BackToProducts>

      <main className="flex w-full flex-col gap-2.5 pt-4.75 pb-10 min-[1120px]:grid min-[1120px]:grid-cols-[minmax(0,740fr)_minmax(0,680fr)] min-[1120px]:grid-rows-[auto_1fr] min-[1120px]:items-start min-[1120px]:gap-x-0 min-[1120px]:gap-y-3.75 min-[1120px]:px-2.5 min-[1120px]:pt-0 min-[1120px]:pb-16">
        {/* Name and price. Desktop: the top of the right column. */}
        <div className="flex flex-col gap-2.5 px-4 md:max-[1120px]:items-center md:max-[1120px]:px-10 md:max-[1120px]:text-center min-[1120px]:col-start-2 min-[1120px]:row-start-1 min-[1120px]:gap-3.75 min-[1120px]:pt-25 min-[1120px]:pr-10 min-[1120px]:pl-[clamp(40px,5.56vw,80px)] min-[1120px]:text-left">
          <h1 className="text-[20px] leading-6.05 font-medium text-black wrap-break-word min-[1120px]:text-[clamp(26px,calc(1.75vw+6.8px),32px)] min-[1120px]:leading-[1.21] min-[1120px]:font-bold">
            {product.product_name}
          </h1>
          <p className="text-[22px] leading-6.65 font-bold text-black min-[1120px]:text-[20px] min-[1120px]:leading-6.05">
            {formatPrice(product.price)}
          </p>
        </div>

        {/* The photos. Desktop: the whole left column (a 40px gap at its left, 70px above). */}
        <div className="flex w-full flex-col gap-2.5 md:max-[1120px]:mx-auto md:max-[1120px]:max-w-225 min-[1120px]:col-start-1 min-[1120px]:row-span-2 min-[1120px]:row-start-1 min-[1120px]:gap-5 min-[1120px]:pt-17.5 min-[1120px]:pl-10">
          <div className="flex h-112.5 w-full items-center min-[1120px]:gap-6.25">
            {images.length > 1 && (
              <PhotoArrow direction="previous" onClick={() => step(-1)} />
            )}
            {/* The photo is shown whole. key: a new photo starts its own loading picture instead of showing the old one. */}
            {shown && (
              <div className="h-full min-w-0 flex-1">
                <PlaceholderPicture
                  key={shown.id}
                  // The small version of this photo is already there (its square is on the page): shown sharp while the big
                  // one comes, instead of only the blurred preview.
                  poster={shown.urls.card}
                  avif={shown.urls.detail.avif}
                  webp={shown.urls.detail.webp}
                  alt={product.product_name}
                  loading="eager"
                  placeholder={shown.placeholder}
                  className="size-full"
                  imgClassName="size-full object-contain"
                  blockClassName="inset-0 bg-[#f9f9f9]"
                  sweep={false}
                />
              </div>
            )}
            {images.length > 1 && <PhotoArrow direction="next" onClick={() => step(1)} />}
          </div>

          {images.length > 1 && (
            <ul className="flex flex-wrap justify-center gap-2.5 self-center px-4 md:px-0 min-[1120px]:max-w-148">
              {images.map((image, i) => (
                <li key={image.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(i)}
                    onPointerEnter={() => setWarm((now) => (now.includes(i) ? now : [...now, i]))}
                    onFocus={() => setWarm((now) => (now.includes(i) ? now : [...now, i]))}
                    aria-label={`Show photo ${i + 1} of ${images.length}`}
                    aria-current={i === selected}
                    className={`block size-20 cursor-pointer bg-[#f9f9f9] md:size-22.5 ${i === selected ? "outline outline-1 outline-black" : ""}`}
                  >
                    <PlaceholderPicture
                      avif={image.urls.card.avif}
                      webp={image.urls.card.webp}
                      alt=""
                      loading="lazy"
                      placeholder={image.placeholder}
                      className="size-full"
                      imgClassName="size-full object-cover"
                      blockClassName="inset-0 bg-[#f3f4f6]"
                    sweep={false}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* The description and "View contact". Desktop: below the price in the right column, with the button FIRST (the
            reversed column puts the button and the contact details above the text). */}
        <div className="flex w-full flex-col gap-3.75 px-4 pt-2.5 md:max-[1120px]:mx-auto md:max-[1120px]:max-w-170 md:max-[1120px]:px-5 min-[1120px]:col-start-2 min-[1120px]:row-start-2 min-[1120px]:flex-col-reverse min-[1120px]:justify-end min-[1120px]:pt-0 min-[1120px]:pr-10 min-[1120px]:pl-[clamp(40px,5.56vw,80px)]">
          {/* pre-line: the owner's own line breaks stay. */}
          <p className="pb-5 text-[16px] leading-5 whitespace-pre-line text-[#111] wrap-break-word min-[1120px]:max-w-140 min-[1120px]:pt-8.75 min-[1120px]:pb-0">
            {product.description}
          </p>
          {/* relative: the contact box is placed against the button. It floats OVER the page (it doesn't push the description
              down, however many details the business gave); same white box, 1px #b8b8b8 line and sharp corners as the account menu. */}
          <div ref={contactRef} className="relative w-fit">
            <button
              type="button"
              onClick={() => setContactOpen((open) => !open)}
              aria-expanded={contactOpen}
              className="flex h-9 w-fit cursor-pointer items-center justify-center border border-black bg-white px-6 text-[14px] leading-[17px] font-semibold text-black"
            >
              View contact
            </button>
            {contactOpen && (
              <div className="absolute top-full left-0 z-20 mt-1 w-[min(17rem,calc(100vw-2rem))] border border-[#b8b8b8] bg-white p-3.5">
                <Contact business={business} />
              </div>
            )}
          </div>
        </div>
      </main>
      {/* Loads the big versions of the photos listed above, out of sight (an image that isn't shown still loads, and through
          <picture> it is the same file the visitor's browser would pick later, so it is a cache hit then). */}
      <div hidden aria-hidden>
        {images.map(
          (image, i) =>
            toLoad.has(i) && (
              <picture key={image.id}>
                <source srcSet={image.urls.detail.avif} type="image/avif" />
                <img src={image.urls.detail.webp} alt="" />
              </picture>
            ),
        )}
      </div>
      </div>
    </div>
  );
}

// The "<" and ">" of the desktop design, at the two ends of the big photo (a 44px box each, like the design). Drawn as thin
// chevrons like the site's other arrows, not as bold text characters. Desktop only: on a phone or tablet the small photos
// are the way to change the photo.
function PhotoArrow({ direction, onClick }: { direction: "previous" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "previous" ? "Previous photo" : "Next photo"}
      className="hidden size-11 shrink-0 cursor-pointer items-center justify-center min-[1120px]:flex"
    >
      <svg aria-hidden viewBox="0 0 10 16" className={`h-5 w-3 ${direction === "next" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 1.5L2 8l6.5 6.5" />
      </svg>
    </button>
  );
}

// The business's contact details, opened by "View contact". Not in the design. The visitor is already on this business's page
// (its name is in the top bar), so no name: how to reach them (phone first, if there is one, then email), where they are (the
// address opens a map), when they are open, and their social pages. Every line but the email is optional.
function Contact({ business }: { business: PublicBusiness }) {
  const link = "underline underline-offset-2";
  const social = [
    business.facebook_link && { label: "Facebook", href: business.facebook_link },
    business.instagram_link && { label: "Instagram", href: business.instagram_link },
  ].filter((item) => !!item);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2 text-[13px] leading-4.5 text-black">
      {business.phone && (
        <Row label="Phone">
          <a href={`tel:${business.phone.replace(/[^d+]/g, "")}`} className={link}>
            {business.phone}
          </a>
        </Row>
      )}
      <Row label="Email">
        <a href={`mailto:${business.contact_email}`} className={link}>
          {business.contact_email}
        </a>
      </Row>
      <Row label="Address">
        {/* Opens the address in a map, in a new tab; nothing is sent to the map service until it is clicked. */}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.formatted_address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={link}
        >
          {business.formatted_address}
        </a>
      </Row>
      {business.hours && <Row label="Hours">{business.hours}</Row>}
      {social.length > 0 && (
        <Row label="Follow">
          <span className="flex flex-wrap gap-x-4">
            {social.map((item) => (
              <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className={link}>
                {item.label}
              </a>
            ))}
          </span>
        </Row>
      )}
    </dl>
  );
}

// A label and its value on one line (the label column is as wide as the longest label), so the box stays short.
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-[12px] font-medium text-[#4b5563]">{label}</dt>
      <dd className="min-w-0 wrap-break-word">{children}</dd>
    </>
  );
}
