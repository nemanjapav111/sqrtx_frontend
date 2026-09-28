"use client";

import { useMemo, useState } from "react";
import type { PublicProduct } from "@/lib/public-site";
import { useSearch } from "./search-context";

// The Products page content: the category filter ("ALL") and the products, each in a grey box with its picture. The
// search box is in the top bar (business-header.tsx) and this list follows it.
//
// Sizes (Figma 2063:8869 phone, 1957:532 tablet, 1424:452 desktop): a product is 350px wide (the full width on a phone
// narrower than 382px) and at least 432px tall (the design's row height: a name on two lines fills it exactly). They
// wrap into as many columns as fit, 40px apart: one column from 382px, two from 800px, three
// from 1190px (the widest row is 1130px), and a last row with fewer products is centered. The filter sits at the left
// edge of that block, 34px above the first row. On tablet and desktop the page has 30px around it.
//
// Not in the design, so placeholders: the words when there is nothing to show; the filter is a normal list that the
// phone's own picker shows. Products are not clickable yet (there is no product page design).

const ALL = "";

// "$12000" or "$25", like the design: no thousands separator, cents only when there are some. No price: "Inquiry"
// (the same word the add-product form promises for a blank price).
function formatPrice(price: PublicProduct["price"]): string {
  if (price === null || price === "") return "Inquiry";
  const amount = Number(price);
  if (!Number.isFinite(amount)) return "Inquiry";
  return `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

export default function ProductList({ products }: { products: PublicProduct[] }) {
  const { query } = useSearch();
  const [category, setCategory] = useState(ALL);

  // Every category the business uses, alphabetical, each once (however it is spelled in capitals).
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of products) if (!seen.has(p.category.toLowerCase())) seen.set(p.category.toLowerCase(), p.category);
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (category === ALL || p.category.toLowerCase() === category.toLowerCase()) &&
        (needle === "" || p.product_name.toLowerCase().includes(needle) || p.category.toLowerCase().includes(needle)),
    );
  }, [products, query, category]);

  return (
    <main className="mx-auto flex w-full flex-col px-4 pb-2.5 md:px-7.5 md:pt-7.5">
      {/* This block is as wide as the columns that fit (350, 740 or 1130px) and centered, so the filter lines up with the
          left edge of the first column. */}
      <div className="mx-auto w-full max-w-87.5 min-[800px]:max-w-185 min-[1190px]:max-w-282.5">
        {/* The category filter. The words and the arrow are what you see; a real list lies invisibly on top, so a phone
            shows its own picker. */}
        <div className="relative mb-8.5 flex h-12 w-fit items-center gap-2 py-2.25 pr-2">
          <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="#1e1e1e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
          <span className="text-[12px] leading-[1.2] font-bold uppercase">{category === ALL ? "All" : category}</span>
          <select
            aria-label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          >
            <option value={ALL}>All</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {products.length === 0 && <p className="text-[14px] text-[#636363]">No products yet.</p>}
        {products.length > 0 && shown.length === 0 && <p className="text-[14px] text-[#636363]">No products match your search.</p>}

        <ul className="flex flex-wrap justify-center gap-10">
          {shown.map((product, index) => {
            const image = product.images.find((i) => i.is_primary) ?? product.images[0];
            return (
              <li key={product.id} className="min-h-108 w-full min-[382px]:w-87.5">
                {/* The picture is shown whole (never cropped) inside a grey box with a soft shadow. */}
                <div className="flex h-87.5 items-center justify-center bg-[#f9f9f9] p-6 shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
                  {image && (
                    <picture className="size-full">
                      <source srcSet={image.urls.card.avif} type="image/avif" />
                      <img
                        src={image.urls.card.webp}
                        alt={product.product_name}
                        // The first few are on screen at once: load them at once. The rest wait until they come near.
                        loading={index < 3 ? "eager" : "lazy"}
                        decoding="async"
                        className="size-full object-contain"
                      />
                    </picture>
                  )}
                </div>
                <h2 className="pt-3.25 pb-0.75 text-[16px] leading-5.5 font-medium text-[#111] wrap-break-word">{product.product_name}</h2>
                <p className="text-[18px] leading-5.5 font-bold">{formatPrice(product.price)}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
