"use client";

import { useRef, useState } from "react";
import type { Dictionary } from "@/app/[lang]/dictionaries/en";
import { fill } from "@/lib/i18n";

type DemoText = Dictionary["landing"]["demo"];

// The picture beside the headline of the business landing page (page.tsx): an EXAMPLE business page drawn as a real one looks (the owner, 2026-10-11: "create it as page
// actually looks", white, no sqrtx window, no Contact button, a furniture business): the browser's bar with the address, the bar of a business's page (the
// logo with the name and the kind of business beside it, Products / Contact / About, the search: app/[slug]/business-header.tsx), the category filter ("All") and the
// product cards (grey card, picture, name, bold price: app/[slug]/product-list.tsx), the second row only peeking out under the first. Everything in it is made up. It is
// not interactive. A phone shows the same page narrower (two cards across, no links in the bar, only the address in the browser's bar).
//
// The pictures are the owner's (CREDITS.txt): the logo and six furniture pictures, made into small AVIF and WebP files in public/landing/ and served from this site:
// <picture> gives the AVIF to a browser that can read it and the WebP to the others. A file's name ends in its version (-1, -2): a new picture gets a new name, so the files
// are cached for good (next.config.ts). `sq` pictures are 400 x 400 (3.2x the 125px a card's picture takes here: sharp on a 3x phone), the logo (the mark only, no words) 240 x 240 (6x its 40 x 40).

// `pic` is the file name without its extension (it ends in the size and the version: a new picture gets a new name).
const PRODUCTS: { key: keyof DemoText["products"]; price: string; pic: string }[] = [
  { key: "coffeeTable", price: "$790", pic: "coffee-table-sq-5" },
  { key: "nestingTables", price: "$420", pic: "nesting-tables-sq-5" },
  { key: "upholsteredChair", price: "$260", pic: "dining-chair-sq-5" },
  { key: "leatherArmchair", price: "$780", pic: "armchair-sq-5" },
  { key: "oakChair", price: "$210", pic: "chair-sq-5" },
  { key: "sideTable", price: "$180", pic: "table-sq-5" },
];

// One card's picture: the grey card with its padding, and in it the picture on white (a square, 400 x 400: the furniture whole on a white background), like the product pictures of a real page.
function CardPicture({ pic }: { pic: string }) {
  return (
    <div className="aspect-square bg-[#f9f9f9] p-[8%]">
      <picture>
        <source srcSet={`/landing/${pic}.avif`} type="image/avif" />
        <img src={`/landing/${pic}.webp`} alt="" width={400} height={400} loading="eager" decoding="async" draggable={false} className="size-full object-contain" />
      </picture>
    </div>
  );
}

// The second example, a law firm (the owner, 2026-10-14: "Fulmen Law", his own pictures): what a business that sells SERVICES looks like. A service is a row, as on a real
// page (service-list.tsx): the photo, the name, the price and a short text with "See more". The names, prices and texts (in the dictionaries) are made up. The third row only peeks out under the first two
// on phone and tablet; on desktop the window is wide enough to show just two.
const SERVICES = [
  { key: "corporate", pic: "fulmen-corporate-1" },
  { key: "ip", pic: "fulmen-ip-1" },
  { key: "employment", pic: "fulmen-employment-1" },
] as const;

// The two examples: the address, the logo (240 x 240 files), the name and the kind of business, and the page's own link in the bar.
const EXAMPLES = {
  products: { address: "/oak-studio", logo: "logo-10", name: "Oak & Studio" },
  services: { address: "/fulmen-law", logo: "fulmen-logo-1", name: "Fulmen Law" },
} as const;

type Example = keyof typeof EXAMPLES;

function LogoPicture({ pic }: { pic: string }) {
  return (
    <picture className="shrink-0">
      <source srcSet={`/landing/${pic}.avif`} type="image/avif" />
      <img src={`/landing/${pic}.webp`} alt="" width={240} height={240} loading="eager" decoding="async" draggable={false} className="size-12" />
    </picture>
  );
}

// A service's photo: 480 x 300 (about 2.9x the 166px it takes here), a cover photo that fills its box.
function ServicePicture({ pic }: { pic?: string }) {
  return (
    <div className="h-full overflow-hidden bg-[#f3f4f6] md:aspect-[8/5] md:h-auto">
      {pic && (
        <picture>
          <source srcSet={`/landing/${pic}.avif`} type="image/avif" />
          <img src={`/landing/${pic}.webp`} alt="" width={480} height={300} loading="eager" decoding="async" draggable={false} className="size-full min-h-20 object-cover" />
        </picture>
      )}
    </div>
  );
}

// The small line icons of the bars (24 x 24, a 2px line, like the site's own chevron in category-filter.tsx).
function Icon({ children, className = "size-4" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`${className} shrink-0`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

// One window. Its shadow is for a window floating over a BLACK page: a dark shadow would not show, so it is a soft light glow (a wide, faint spread and a tighter one under the window) over a hairline.
function ExampleWindow({ example, text }: { example: Example; text: DemoText }) {
  const biz = EXAMPLES[example];
  const kind = text[example].kind;
  const link = text[example].link;
  return (
      <div aria-hidden className="h-full overflow-hidden border border-[#d4d4d4] bg-white text-black shadow-[0_30px_80px_-10px_rgba(255,255,255,0.16),0_10px_30px_-5px_rgba(255,255,255,0.10)] md:h-110">
        {/* The browser's bar: the three window buttons, back / forward / reload, and the address in a rounded field with the padlock, the https dimmed and the address itself dark */}
        <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-[#f3f4f6] px-3 py-2">
          <div className="hidden gap-1.5 md:flex">
            <span className="size-2.5 rounded-full bg-[#d1d5db]" />
            <span className="size-2.5 rounded-full bg-[#d1d5db]" />
            <span className="size-2.5 rounded-full bg-[#d1d5db]" />
          </div>
          <div className="hidden items-center gap-2 text-[#6b7280] md:flex">
            <Icon className="size-4">
              <path d="m15 18-6-6 6-6" />
            </Icon>
            <Icon className="size-4">
              <path d="m9 18 6-6-6-6" />
            </Icon>
            <Icon className="size-4">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </Icon>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] shadow-[inset_0_0_0_1px_#e5e7eb]">
            <Icon className="size-3 text-[#6b7280]">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </Icon>
            <p className="truncate whitespace-nowrap">
              <span className="text-[#9ca3af]">https://</span>
              <span>sqrtx.co</span>
              <span className="text-[#6b7280]">{biz.address}</span>
            </p>
          </div>
        </div>

        {/* The bar of the business's page, laid out as the real one (app/[slug]/business-header.tsx, measured on /fashionx at 1280px: 69px high; the way back to sqrtx and the account icon are left out of the example (the owner, 2026-10-12): the logo, the name
            (16px, semibold) with the kind of business under it (13px, grey), the links (15px, medium), the search (a magnifier and a field with a line under it)),
            at the size this small window has room for. */}
        <div className="flex h-17.25 items-center gap-2 border-b border-[#e5e7eb] px-3">
          <LogoPicture pic={biz.logo} />
          <div className="shrink-0 leading-tight">
            <p className="text-[13px] font-semibold whitespace-nowrap">{biz.name}</p>
            <p className="mt-0.5 text-[11px] font-medium text-[#6b7280]">{kind}</p>
          </div>
          <div className="mx-auto hidden items-center gap-2.5 text-[11px] font-medium text-[#6b7280] md:flex">
            <span className="border-b-[1.5px] border-black pb-1 text-black">{link}</span>
            <span className="pb-1">{text.contact}</span>
            <span className="pb-1">{text.about}</span>
          </div>
          <span className="hidden w-28 shrink-0 items-center gap-1.5 border-b border-[#d1d5db] pb-1.5 text-[11px] text-[#9ca3af] md:flex">
            <Icon className="size-3">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </Icon>
            {text.find}
          </span>
        </div>

        {/* The filter and the cards (products) or the rows (services) */}
        <div className="px-3.5 pt-3">
          <p className="mb-3 flex items-center gap-1 text-[11px] font-bold">
            <Icon className="size-4 text-[#1e1e1e]">
              <path d="m6 9 6 6 6-6" />
            </Icon>
            {text.all}
          </p>
          {example === "products" ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {PRODUCTS.map((product, index) => (
                <div key={product.key} className={index > 3 ? "hidden md:block" : ""}>
                  <div className="shadow-[0_2px_2px_rgba(0,0,0,0.22)]">
                    <CardPicture pic={product.pic} />
                  </div>
                  <p className="mt-1.5 text-[11px]">{text.products[product.key]}</p>
                  <p className="text-[11px] font-bold">{product.price}</p>
                </div>
              ))}
            </div>
          ) : (
            <ul className="flex flex-col">
              {SERVICES.map((service, index) => (
                <li key={service.key} className={`grid grid-cols-[42fr_58fr] gap-3 py-2.5 first:pt-0 md:grid-cols-[36fr_64fr] ${index > 0 ? "border-t border-[#e5e7eb]" : ""} ${index > 1 ? "min-[1120px]:hidden" : ""}`}>
                  <ServicePicture pic={service.pic} />
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="line-clamp-2 text-[13px] leading-tight font-bold md:line-clamp-1">{text.services[service.key].name}</p>
                    <p className="text-[12px] leading-tight font-semibold">{text.services[service.key].price}</p>
                    <p className="line-clamp-2 text-[11px] leading-[1.3] text-[#4b5563] md:line-clamp-4">{text.services[service.key].text}</p>
                    <span className="w-fit border-b border-black text-[11px] leading-tight font-bold">{text.seeMore}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
  );
}

const ORDER: Example[] = ["products", "services"];

// On a phone the two examples sit side by side in a row that scrolls sideways and snaps: the second window peeks in from the right edge (the hint that there is more) and two dots
// under the row show which one is in front (they are buttons too). From 768px up it is one window and the names under it switch it, as before.
export default function HeroShowcase({ text }: { text: DemoText }) {
  const [example, setExample] = useState<Example>("products");
  const [page, setPage] = useState(0);
  const row = useRef<HTMLDivElement>(null);

  function onScroll() {
    const el = row.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setPage(max > 0 && el.scrollLeft > max / 2 ? 1 : 0);
  }

  function goTo(index: number) {
    const el = row.current;
    if (!el) return;
    const slide = el.children[index] as HTMLElement | undefined;
    if (slide) el.scrollTo({ left: slide.offsetLeft - el.offsetLeft - 16, behavior: "smooth" });
  }

  // data-nosnippet: Google must not take the demo's text (a law firm's price list) as the page's search-result description.
  return (
    <div data-nosnippet className="float-in relative w-full md:mx-auto md:max-w-125 min-[1120px]:mr-0! min-[1120px]:ml-auto! min-[1120px]:max-w-155!">
      <div
        ref={row}
        onScroll={onScroll}
        className="-mx-4 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:block md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {ORDER.map((key) => (
          <div key={key} className={`w-[86%] shrink-0 snap-start scroll-ml-4 md:w-full ${example === key ? "md:block" : "md:hidden"}`}>
            <div key={example === key ? "front" : "back"} className="example-fade h-full md:h-auto">
              <ExampleWindow example={key} text={text} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-center gap-2 md:hidden">
        {ORDER.map((key, index) => (
          <button
            key={key}
            type="button"
            aria-label={fill(text.show, { name: EXAMPLES[key].name })}
            aria-current={page === index}
            onClick={() => goTo(index)}
            className={`size-2 cursor-pointer rounded-full transition-colors ${page === index ? "bg-[#00cf37]" : "bg-[#525252]"}`}
          />
        ))}
      </div>

      {/* The switch under the window (tablet and up): the same window, showing a business that sells products or one that sells services. */}
      <div role="group" aria-label={text.group} className="mt-5 hidden justify-center gap-6 text-[13px] font-medium md:flex">
        {(["products", "services"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={example === key}
            onClick={() => setExample(key)}
            className={`cursor-pointer border-b-[1.5px] pb-1 transition-colors ${example === key ? "border-white text-white" : "border-transparent text-[#737373] hover:text-white"}`}
          >
            {EXAMPLES[key].name}
          </button>
        ))}
      </div>
    </div>
  );
}
