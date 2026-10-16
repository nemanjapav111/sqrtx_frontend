"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useCommonText } from "@/app/[lang]/components/lang-context";
import type { Dictionary } from "@/app/[lang]/dictionaries/en";
import PlaceholderPicture, { avifSourceSet, markSeen } from "@/app/[lang]/components/placeholder-picture";
import { POPUP_ABOVE, POPUP_BELOW, POPUP_CARD, POPUP_GAP } from "@/app/[lang]/components/popup";
import { usePopupDismiss } from "@/app/[lang]/components/use-popup-dismiss";
import ArrowIcon from "@/app/[lang]/register/arrow-icon";
import { fill } from "@/lib/i18n";
import { formatPrice, formatServicePrice } from "@/lib/price";
import type { PublicBusiness, PublicProductImage } from "@/lib/public-site";
import BackToProducts from "../back-to-products";
import { hasVisited } from "../path-tracker";
import PhotoViewer from "./photo-viewer";

// A product's or a service's own page (the services' designs, Figma "Service Details Phone/Tablet/Desktop new" 2151:368, 2036:612,
// 1673:194, are the products' ones with other words, so it is one component), in the three sizes of the designs (Figma 2108:344 phone
// 360 x 840, 1988:1874 tablet 768 x 909, 1560:134 desktop 1440 x 1024). The top bar is the site's own (the layout draws it); the way back to the list is
// a bare arrow: in front of the search line on phone and tablet (the design's; header-search.tsx and home-search.tsx draw it), and on desktop at the
// page's top left corner (this component; with no words, 2026-10-07: the owner wanted the words gone).
//  - Phone and tablet (under 1120px): one column, in this order: the photos (a swiped strip of photos 450px high, shown whole, never cropped, and the small photos under it),
//    the name and the price (24px, left-aligned, no gap between them), the business's slim line (marketplace only), "Contact the seller", a service's facts and the description.
//    The column is the window's width less 16px at each side on a phone, and 680px, centered, on a tablet (768px up), where the photo, the small photos and the text share its left edge.
//  - Desktop (1120px up; the design is 1440 wide, 1120 is where the two columns still fit): the photos at the left with "<" ">" arrows on the big photo, and at the right the
//    same order: the name (32px bold), the price (20px bold), the slim line, "Contact the seller", the facts and the description (all 560px wide).
// The "Contact the seller" button is the page's main button (black, white 16px bold text, 44px high, the same black as the lists' "See More"; full width on a
// phone), on products and services alike (owner's choice 2026-10-02: it used to be a small outlined one, and what it does is unchanged).
// A service also shows its facts (item.service): how long it takes and where the business works (the owner's two optional lines), and the
// business's hours and address, which were only in the contact box, between the button and the text.
// Where I chose (not in the designs):
//  - What "Contact the seller" does: it opens the business's contact details in a box that floats under the button (there is no Contact page yet): phone,
//    email, address (a map link), hours and social pages, no name (it is in the top bar already).
//  - A click on the big photo opens it in the photo viewer (photo-viewer.tsx): the "full" size, as large as the window allows.
//  - The chosen small photo has a thin black outline; the photo arrows go round (after the last comes the first) and only
//    show when there is more than one photo; a product with one photo has no small ones.
// Between the designs' widths it keeps its shape instead of stretching: the content never grows past 1440px and is centered,
// from 1120px the two columns keep the design's 740:680 proportions and the right column's name and left space shrink
// with the window, and on a tablet the column stops at 680px.
// CSS gotcha (also in header-links.tsx): `md:` (768px up) and `min-[1120px]:` both match on a desktop and the md rule wins, so
// what only tablet needs is written `md:max-[1120px]:` (768 up to, not including, 1120).
// What the page shows of a product or a service, and where the back arrow leads (the list the visitor came from).
export interface DetailItem {
  name: string;
  price: number | string | null;
  priceType?: string; // a service's: what the price means (the API's price_type); a product has none and a blank price reads "Price on request"
  description: string;
  images: PublicProductImage[];
  service?: { duration: string | null; area: string | null }; // present on a service's page: its facts
}

// `companyLine`: only on a product's or service's page in the sqrtx marketplace, where the page has no business top bar to say whose it is: the business's slim line (components/company-line.tsx:
// logo, name, city, chevron; a tap opens the business's page). On EVERY size it is right under the name and the price, and "Contact the seller" right under it (2026-10-11, the owner: desktop follows
// phone and tablet; before, desktop had the bigger company card above the name).
export default function ItemDetail({
  item,
  business,
  slug,
  backTo,
  backLabel,
  companyLine,
  text,
}: {
  item: DetailItem;
  business: PublicBusiness;
  slug: string;
  backTo: string;
  backLabel: string;
  companyLine?: React.ReactNode; // the business's slim line, under the name and the price (components/company-line.tsx)
  text: Dictionary["item"]; // the page's own words
}) {
  const common = useCommonText();
  const images = [...item.images].sort((a, b) => a.sort_order - b.sort_order);
  // The main photo pops in when the visitor arrives from another page, not on a fresh load or a refresh (globals.css, .item-photo-in); decided once.
  // On a fresh load the page's own box hydrates after the tracker has already seen it, so this reads true then, while the server drew no pop: the two
  // photo boxes below say so (suppressHydrationWarning), and keep the server's version (no pop), which is what a fresh load wants anyway.
  const [pop] = useState(hasVisited);
  const [selected, setSelected] = useState(0);
  const [viewing, setViewing] = useState(false); // the photo viewer is open
  const [fullWarm, setFullWarm] = useState<number | null>(null); // the photo whose full size is loaded out of sight (the pointer is on it)
  const photo = useRef<HTMLButtonElement>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const contactRef = useRef<HTMLDivElement>(null);
  const contactBox = useRef<HTMLDivElement>(null);
  // Where the contact box opens: under the button when it fits there, else above it when it fits there, else on the side with more room. Worked out when it opens, before it is
  // painted (a layout effect), from the box's own height and the room between the button and what is fixed to the screen: the bottom bar on a phone (the pages' bar), and the top bar.
  const [contactUp, setContactUp] = useState(false);
  useLayoutEffect(() => {
    if (!contactOpen) return;
    const button = contactRef.current?.getBoundingClientRect();
    const box = contactBox.current?.offsetHeight;
    if (!button || !box) return;
    const bottomBar = [...document.querySelectorAll("nav")].map((nav) => nav.getBoundingClientRect()).find((r) => r.height > 0 && r.top > window.innerHeight / 2 && r.bottom >= window.innerHeight - 1);
    const header = document.querySelector("header[data-site-header]")?.getBoundingClientRect().bottom ?? 0;
    const below = (bottomBar?.top ?? window.innerHeight) - button.bottom - POPUP_GAP;
    const above = button.top - header - POPUP_GAP;
    setContactUp(below < box && (above >= box || above > below));
  }, [contactOpen]);
  // The contact box floats over the page, so it closes like the account menu does: a click outside it (that click does nothing else), or Escape.
  usePopupDismiss(contactOpen, contactRef, () => setContactOpen(false));
  const shown = images[selected] ?? images[0];
  // The photos whose big version is loaded before it is asked for, so choosing one shows it at once instead of after a
  // download: the two next to the shown one (also going round, as the arrows do), and any small photo the visitor's
  // pointer or finger is on (choosing one usually follows). Not all of them: a product can have 30 photos of 100 to 300 KB
  // and most visitors never look at more than a few.
  const [warm, setWarm] = useState<number[]>([]);
  const toLoad = new Set([...warm, (selected + 1) % images.length, (selected - 1 + images.length) % images.length]);
  toLoad.delete(selected);
  const step = useCallback((by: number) => setSelected((i) => (i + by + images.length) % images.length), [images.length]);
  const closeViewer = useCallback(() => {
    setViewing(false);
    photo.current?.focus(); // back to the photo that was clicked
  }, []);

  // PHONE AND TABLET (under 1120px): the big photo is a strip of all the photos that is swiped sideways (CSS scroll snap, `snap-always`: one photo at a time, a quick flick cannot skip over one), and the row of small photos goes with it. Swiping
  // changes `selected` (the photo that is more than half in view). Choosing a small photo (or anything else that changes `selected`) does NOT slide the strip (2026-10-10, the owner:
  // "don't make sliding animation, make ease in ease out"): the photo fades out (140ms, ease-in), the strip jumps to the chosen one while it is not seen, and it fades in (200ms,
  // ease-out). People who ask for less motion get a jump at once. While this runs, the strip's own scrolling does not change `selected` (scrollingTo); a finger on the strip ends it
  // at once (onPointerDown: the jump is done first, so the visitor is looking at the chosen photo), and a timer ends it if the page stops running animations (a hidden tab).
  // The selected small photo is kept in the middle of its row. On desktop (1120px up) the strip is not shown (clientWidth 0) and the single photo with its arrows is.
  const strip = useRef<HTMLDivElement>(null);
  const thumbList = useRef<HTMLUListElement>(null);
  const scrollingTo = useRef<number | null>(null);
  // The photo the strip's own scrolling made the selected one (a swipe), so the effect below can tell it from a choice made elsewhere (a small photo, an arrow, the viewer).
  const selectedByScroll = useRef<number | null>(null);
  const fade = useRef<{ animations: Animation[]; timer: number; jumpTo: number | null } | null>(null);
  const stopFade = useCallback(() => {
    const running = fade.current;
    fade.current = null;
    scrollingTo.current = null;
    if (!running) return;
    window.clearTimeout(running.timer);
    if (running.jumpTo !== null && strip.current) strip.current.scrollLeft = running.jumpTo; // not jumped yet: do it now
    running.animations.forEach((animation) => animation.cancel());
  }, []);
  useEffect(() => stopFade, [stopFade]);
  useEffect(() => {
    const el = strip.current;
    // A swipe already put the strip where it is: nothing to move. (Before this was only guessed from where the strip happened to be when this ran, a frame or more after the swipe changed
    // `selected`: in a quick flick the strip was already past the next photo, so it was thought to be out of step and was fade-jumped back to the old selection: a photo "jumping".)
    const bySwipe = selectedByScroll.current === selected;
    selectedByScroll.current = null;
    if (el && !bySwipe && el.clientWidth > 0 && Math.round(el.scrollLeft / el.clientWidth) !== selected) {
      stopFade();
      const to = selected * el.clientWidth;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.scrollLeft = to;
      } else {
        scrollingTo.current = selected;
        const state = { animations: [] as Animation[], timer: 0, jumpTo: to as number | null };
        fade.current = state;
        const fadeOut = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: "ease-in", fill: "forwards" });
        state.animations = [fadeOut];
        fadeOut.onfinish = () => {
          el.scrollLeft = to;
          state.jumpTo = null;
          // The fade-in is made BEFORE the fade-out is removed, so the photo is never drawn at full strength in between.
          const fadeIn = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
          state.animations = [fadeIn, fadeOut];
          fadeOut.cancel();
          fadeIn.onfinish = () => {
            if (fade.current === state) stopFade();
          };
        };
        state.timer = window.setTimeout(() => {
          if (fade.current === state) stopFade();
        }, 900);
      }
    }
    const list = thumbList.current;
    const thumb = list?.children[selected] as HTMLElement | undefined;
    if (list && thumb && list.scrollWidth > list.clientWidth) {
      list.scrollTo({ left: thumb.offsetLeft - (list.clientWidth - thumb.offsetWidth) / 2, behavior: "smooth" });
    }
  }, [selected, stopFade]);
  const onStripScroll = () => {
    const el = strip.current;
    if (!el || el.clientWidth === 0 || scrollingTo.current !== null) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== selected && images[index]) {
      selectedByScroll.current = index;
      setSelected(index);
    }
  };

  return (
    <div className="flex w-full flex-1 flex-col">
      {/* The content is at most 1440px wide (the design's) and centered; everything of the page is placed against THIS box,
          so on a wider window nothing is left behind at the window's edge. */}
      <div className="relative mx-auto w-full max-w-360">
      <main className={`flex w-full flex-col gap-2.5 pt-1.5 pb-10 min-[1120px]:grid min-[1120px]:grid-cols-[minmax(0,740fr)_minmax(0,680fr)] ${companyLine ? "min-[1120px]:grid-rows-[auto_auto_1fr]" : "min-[1120px]:grid-rows-[auto_1fr]"} min-[1120px]:items-start min-[1120px]:gap-x-0 min-[1120px]:gap-y-3.75 min-[1120px]:px-2.5 min-[1120px]:pt-0 min-[1120px]:pb-16`}>
        {/* The way back, on DESKTOP only: the site's thin arrow, no words (the label is for screen readers), above the left edge of the photo area (20px from the top; 108px from the
            content's left edge: the column's 10 + 40, the gallery arrow's 44 and its 25 gap, less the arrow's own 10px padding; absolute, so it is not a grid cell: the main box is not positioned, the box around it is). On phone
            and tablet the arrow is in front of the search line (header-search.tsx, home-search.tsx). */}
        <BackToProducts
          slug={slug}
          to={backTo}
          label={backLabel}
          className="hidden h-11 items-center self-start text-black min-[1120px]:absolute min-[1120px]:top-5 min-[1120px]:left-27 min-[1120px]:z-10 min-[1120px]:flex min-[1120px]:px-2.5"
        >
          <ArrowIcon className="h-4 w-4.5 shrink-0 rotate-180" strokeWidth={1.6} />
        </BackToProducts>

        {/* Name and price. Phone and tablet: under the photos (order-2), both 24px with no gap between them; tablet: centered, under the centered photo (and so is the button). Desktop: the top of the right column, with its own sizes and a gap. */}
        <div className="flex flex-col px-4 max-[1120px]:order-2 md:max-[1120px]:mx-auto md:max-[1120px]:w-full md:max-[1120px]:max-w-170 md:max-[1120px]:px-0 md:max-[1120px]:pt-2 md:max-[1120px]:text-center min-[1120px]:col-start-2 min-[1120px]:row-start-1 min-[1120px]:gap-3.75 min-[1120px]:pt-25 min-[1120px]:pr-10 min-[1120px]:pl-[clamp(40px,5.56vw,80px)] min-[1120px]:text-left">
          <h1 className="text-[24px] leading-[1.2] font-semibold text-black wrap-break-word min-[1120px]:text-[clamp(26px,calc(1.75vw+6.8px),32px)] min-[1120px]:leading-[1.21] min-[1120px]:font-bold">
            {item.name}
          </h1>
          <p className="text-[24px] leading-[1.2] font-bold text-black min-[1120px]:text-[20px] min-[1120px]:leading-[1.21]">
            {item.service ? formatServicePrice(item.price, item.priceType, business.currency, common.price) : formatPrice(item.price, business.currency, common.price)}
          </p>
        </div>

        {/* The photos. Desktop: the whole left column (a 40px gap at its left, 96px above: the back arrow sits above it with room to spare). */}
        <div className={`flex w-full flex-col gap-2.5 max-[1120px]:order-1 md:max-[1120px]:mx-auto md:max-[1120px]:max-w-170 min-[1120px]:col-start-1 ${companyLine ? "min-[1120px]:row-span-3" : "min-[1120px]:row-span-2"} min-[1120px]:row-start-1 min-[1120px]:gap-5 min-[1120px]:pt-24 min-[1120px]:pl-10`}>
          {/* The photo is 450px high on every size (a height that follows the screen made the page look as if it did not scroll). */}
          <div className="flex h-112.5 w-full items-center min-[1120px]:gap-6.25">
            {images.length > 1 ? (
              <PhotoArrow direction="previous" onClick={() => step(-1)} text={text} />
            ) : (
              <span aria-hidden className="hidden size-11 shrink-0 min-[1120px]:block" />
            )}
            {/* PHONE AND TABLET (under 1120px): the strip of photos, swiped sideways. Only the shown photo and its two neighbours have their picture (a product can have 30 photos); the others are empty
                slides of the same width, so the strip's length and the scrolling are right. */}
            <div
              ref={strip}
              onScroll={onStripScroll}
              onPointerDown={stopFade}
              suppressHydrationWarning
              className={`${pop ? "item-photo-in " : ""}flex h-full min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] min-[1120px]:hidden`}
            >
              {images.map((image, i) => (
                <div key={image.id} className="h-full w-full shrink-0 snap-center snap-always">
                  {Math.abs(i - selected) <= 1 && (
                    <button type="button" onClick={() => setViewing(true)} aria-label={text.enlarge} className="block size-full">
                      <PlaceholderPicture
                        poster={image.urls.card ? { ...image.urls.card, avif3x: image.urls.card3x?.avif } : null}
                        avif={image.urls.detail.avif}
                        avif3x={image.urls.detail3x?.avif}
                        webp={image.urls.detail.webp}
                        alt={i === selected ? item.name : ""}
                        loading={i === selected ? "eager" : "lazy"}
                        placeholder={image.placeholder}
                        className="size-full"
                        imgClassName="size-full object-contain"
                        blockClassName="inset-0 bg-[#f9f9f9]"
                        sweep={false}
                      />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {/* The photo is shown whole. key: a new photo starts its own loading picture instead of showing the old one. Desktop (1120px and up): one photo with its arrows. */}
            {shown && (
              <div suppressHydrationWarning className={`${pop ? "item-photo-in " : ""}h-full min-w-0 flex-1 max-[1120px]:hidden`}>
                {/* A button, so the photo can be opened with the keyboard too. The full size starts loading as soon as the pointer is on it. */}
                <button
                  ref={photo}
                  type="button"
                  onClick={() => setViewing(true)}
                  onPointerEnter={() => setFullWarm(selected)}
                  onFocus={() => setFullWarm(selected)}
                  aria-label={text.enlarge}
                  className="block size-full cursor-zoom-in"
                >
                  <PlaceholderPicture
                    key={shown.id}
                    // The small version of this photo is already there (its square is on the page): shown sharp while the big
                    // one comes, instead of only the blurred preview.
                    // (A service has no card: its rows showed this very detail picture, which is cached, so there is no poster.)
                    poster={shown.urls.card ? { ...shown.urls.card, avif3x: shown.urls.card3x?.avif } : null}
                    avif={shown.urls.detail.avif}
                    avif3x={shown.urls.detail3x?.avif}
                    webp={shown.urls.detail.webp}
                    alt={item.name}
                    loading="eager"
                    placeholder={shown.placeholder}
                    className="size-full"
                    imgClassName="size-full object-contain"
                    blockClassName="inset-0 bg-[#f9f9f9]"
                    sweep={false}
                  />
                </button>
              </div>
            )}
            {images.length > 1 ? (
              <PhotoArrow direction="next" onClick={() => step(1)} text={text} />
            ) : (
              <span aria-hidden className="hidden size-11 shrink-0 min-[1120px]:block" />
            )}
          </div>

          {images.length > 1 && (
            // PHONE: one row that is swiped sideways (not wrapped into rows that would push the name down, a product can have 30 photos); the 1px of padding keeps the chosen photo's outline from being cut.
            // DESKTOP: starts at the photo's left edge (44px arrow + 25px gap = 69px) and wraps at the column's right edge.
            <ul ref={thumbList} className="relative flex flex-wrap gap-2.5 self-start px-4 max-md:w-full max-md:flex-nowrap max-md:overflow-x-auto max-md:py-px max-md:[scrollbar-width:none] md:px-0 min-[1120px]:ml-17.25 min-[1120px]:self-stretch">
              {images.map((image, i) => (
                <li key={image.id} className="max-md:shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelected(i)}
                    onPointerEnter={() => setWarm((now) => (now.includes(i) ? now : [...now, i]))}
                    // A finger gives no "enter" before the tap: its first touch is the earliest sign it is about to choose this one.
                    onPointerDown={() => setWarm((now) => (now.includes(i) ? now : [...now, i]))}
                    onFocus={() => setWarm((now) => (now.includes(i) ? now : [...now, i]))}
                    aria-label={fill(text.showPhoto, { n: i + 1, total: images.length })}
                    aria-current={i === selected}
                    className={`block size-14 cursor-pointer bg-[#f9f9f9] md:size-22.5 ${i === selected ? "outline outline-1 outline-black" : ""}`}
                  >
                    <PlaceholderPicture
                      // The small square (270 px); a photo saved before it existed has the card picture instead.
                      avif={(image.urls.thumb ?? image.urls.card ?? image.urls.detail).avif}
                      webp={(image.urls.thumb ?? image.urls.card ?? image.urls.detail).webp}
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

        {/* The business's slim line (components/company-line.tsx), under the name and the price, on every size; a tap opens the business's page. Phone: 16px at the sides; tablet: in the 680px column of the text; desktop: in the right column, at the name's left edge. */}
        {companyLine && <div className="px-4 max-[1120px]:order-3 md:max-[1120px]:mx-auto md:max-[1120px]:w-full md:max-[1120px]:max-w-170 md:max-[1120px]:px-0 min-[1120px]:col-start-2 min-[1120px]:row-start-2 min-[1120px]:pr-10 min-[1120px]:pl-[clamp(40px,5.56vw,80px)]">{companyLine}</div>}

        {/* "Contact the seller" and the description, on every size: the button FIRST (right under the business's line), then a service's facts, then the text (which can be long): the `order` classes. Desktop: in the right column under the business's line. */}
        <div className={`flex w-full flex-col gap-3.75 px-4 pt-2.5 max-[1120px]:order-4 md:max-[1120px]:mx-auto md:max-[1120px]:max-w-170 md:max-[1120px]:px-0 min-[1120px]:col-start-2 ${companyLine ? "min-[1120px]:row-start-3" : "min-[1120px]:row-start-2"} min-[1120px]:pt-0 min-[1120px]:pr-10 min-[1120px]:pl-[clamp(40px,5.56vw,80px)]`}>
          {item.service && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 border-y border-[#e5e7eb] py-3.5 text-[14px] leading-5 text-black order-2 min-[1120px]:max-w-140">
              {item.service.duration && <Row label={text.duration}>{item.service.duration}</Row>}
              {item.service.area && <Row label={text.serviceArea}>{item.service.area}</Row>}
              {business.hours && (
                <Row label={common.details.hours}>
                  <span className="whitespace-pre-line">{business.hours}</span>
                </Row>
              )}
              <Row label={common.details.location}>
                {/* Opens the address in a map, in a new tab; nothing is sent to the map service until it is clicked. */}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.formatted_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  {business.formatted_address}
                </a>
              </Row>
            </dl>
          )}
          {/* pre-line: the owner's own line breaks stay. */}
          <p className="pb-5 text-[16px] leading-5 whitespace-pre-line text-[#111] wrap-break-word order-3 min-[1120px]:max-w-140 min-[1120px]:pt-8.75 min-[1120px]:pb-0">
            {item.description}
          </p>
          {/* relative: the contact box is placed against the button. It floats OVER the page (it doesn't push the description
              down, however many details the business gave); the card of every popup of the site (components/popup.tsx). */}
          {/* "Contact the seller" comes FIRST here, right under the business's line (then a service's facts, then the text). */}
          <div ref={contactRef} className="relative order-1 w-full md:w-fit md:max-[1120px]:self-center">
            <button
              type="button"
              onClick={() => {
                setContactUp(false); // it is first drawn below the button, then moved above it before it is painted if it has no room there
                setContactOpen((open) => !open);
              }}
              aria-expanded={contactOpen}
              className="flex h-11 w-full cursor-pointer items-center justify-center bg-black px-8 text-[16px] leading-[1.21] font-bold text-white md:w-fit md:min-w-48"
            >
              {text.contactSeller}
            </button>
            {contactOpen && (
              <>
                {/* From 768px up: the popup under the button. */}
                <div ref={contactBox} className={`absolute ${contactUp ? POPUP_ABOVE : POPUP_BELOW} left-0 z-20 hidden w-[min(24rem,calc(100vw-2rem))] p-3.5 md:block ${POPUP_CARD}`}>
                  <Contact business={business} />
                </div>
                {/* On a phone: a sheet at the bottom of the screen with big rows to tap (the popup's small links are hard to hit with a thumb). It is inside the box
                    that usePopupDismiss watches, so a tap on a row is not taken for a tap outside; the dimmed page behind it closes it by its own click. */}
                <div className="md:hidden">
                  <div aria-hidden onClick={() => setContactOpen(false)} className="fixed inset-0 z-30 bg-black/35" />
                  <ContactSheet business={business} text={text} onClose={() => setContactOpen(false)} />
                </div>
              </>
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
                <source srcSet={avifSourceSet(image.urls.detail.avif, image.urls.detail3x?.avif)} type="image/avif" />
                {/* Once it has loaded it counts as seen: choosing it then swaps it in at once instead of fading it in over its small version. */}
                <img src={image.urls.detail.webp} alt="" onLoad={() => markSeen(image.urls.detail.webp)} />
              </picture>
            ),
        )}
        {/* The full size of the photo the pointer is on, so the viewer has it (or most of it) by the time of the click. */}
        {fullWarm !== null && images[fullWarm] && (
          <picture key={`full-${images[fullWarm].id}`}>
            <source srcSet={images[fullWarm].urls.full.avif} type="image/avif" />
            <img src={images[fullWarm].urls.full.webp} alt="" onLoad={() => markSeen(images[fullWarm].urls.full.webp)} />
          </picture>
        )}
      </div>
      {viewing && <PhotoViewer images={images} index={selected} name={item.name} onStep={step} onClose={closeViewer} text={text} />}
      </div>
    </div>
  );
}

// The "<" and ">" of the desktop design, at the two ends of the big photo (a 44px box each, like the design). Drawn as thin
// chevrons like the site's other arrows, not as bold text characters. Desktop only: on a phone or tablet the small photos
// are the way to change the photo.
function PhotoArrow({ direction, onClick, text }: { direction: "previous" | "next"; onClick: () => void; text: Dictionary["item"] }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "previous" ? text.previous : text.next}
      className="hidden size-11 shrink-0 cursor-pointer items-center justify-center min-[1120px]:flex"
    >
      <svg aria-hidden viewBox="0 0 10 16" className={`h-5 w-3 ${direction === "next" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 1.5L2 8l6.5 6.5" />
      </svg>
    </button>
  );
}

// The business's contact details, opened by "Contact the seller". Not in the design. The visitor is already on this business's page
// (its name is in the top bar), so no name: how to reach them (phone first, if there is one, then email), where they are (the
// address opens a map), when they are open, and their social pages. Every line but the email is optional.
function Contact({ business }: { business: PublicBusiness }) {
  const common = useCommonText();
  const link = "underline underline-offset-2";
  const social = [
    business.facebook_link && { label: "Facebook", href: business.facebook_link },
    business.instagram_link && { label: "Instagram", href: business.instagram_link },
  ].filter((item) => !!item);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-2 text-[13px] leading-4.5 text-black">
      {business.phone && (
        <Row label={common.details.phone}>
          <a href={`tel:${business.phone.replace(/[^\d+]/g, "")}`} className={link}>
            {business.phone}
          </a>
        </Row>
      )}
      <Row label={common.details.email}>
        <a href={`mailto:${business.contact_email}`} className={link}>
          {business.contact_email}
        </a>
      </Row>
      <Row label={common.details.address}>
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
      {business.hours && <Row label={common.details.hours}>{business.hours}</Row>}
      {social.length > 0 && (
        <Row label={common.details.follow}>
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

// The phone version of the contact details: how to reach the business first, as two big rows (call, then email), then where they are, when they are open and their social pages.
function ContactSheet({ business, text, onClose }: { business: PublicBusiness; text: Dictionary["item"]; onClose: () => void }) {
  const common = useCommonText();
  const row = "flex h-12 w-full items-center justify-between border border-black px-3.5 text-[15px] font-semibold";
  const link = "underline underline-offset-2";
  const social = [
    business.facebook_link && { label: "Facebook", href: business.facebook_link },
    business.instagram_link && { label: "Instagram", href: business.instagram_link },
  ].filter((item) => !!item);
  return (
    <div role="dialog" aria-label={fill(text.contactName, { name: business.company_name })} className="fixed inset-x-0 bottom-0 z-40 bg-white px-4 pt-4.5 pb-6 shadow-[0_-8px_28px_rgba(0,0,0,0.28)]">
      <p className="pb-3 text-[18px] leading-[1.2] font-bold">{fill(text.contactName, { name: business.company_name })}</p>
      <div className="flex flex-col gap-2">
        {business.phone && (
          <a href={`tel:${business.phone.replace(/[^\d+]/g, "")}`} className={row}>
            <span className="min-w-0 truncate">{fill(text.call, { phone: business.phone })}</span>
            <span aria-hidden>›</span>
          </a>
        )}
        <a href={`mailto:${business.contact_email}`} className={row}>
          <span className="min-w-0 truncate">{fill(text.writeEmail, { email: business.contact_email })}</span>
          <span aria-hidden>›</span>
        </a>
      </div>
      <div className="flex flex-col gap-1 pt-3.5 text-[14px] leading-5 text-[#4b5563]">
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.formatted_address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={link}
        >
          {business.formatted_address}
        </a>
        {business.hours && <p>{business.hours}</p>}
        {social.length > 0 && (
          <p className="flex flex-wrap gap-x-4">
            {social.map((item) => (
              <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className={link}>
                {item.label}
              </a>
            ))}
          </p>
        )}
      </div>
      <button type="button" onClick={onClose} className="mt-4 w-full cursor-pointer text-center text-[14px] font-semibold text-[#4b5563]">
        {common.close}
      </button>
    </div>
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
