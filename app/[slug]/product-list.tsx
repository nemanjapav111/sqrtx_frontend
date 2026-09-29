"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import PlaceholderPicture from "@/app/components/placeholder-picture";
import { formatPrice } from "@/lib/products";
import type { PublicProduct } from "@/lib/public-site";
import CategoryFilter from "./category-filter";
import { useSearch } from "./search-context";

// The Products page content: the category filter ("ALL") and the products, each in a grey box with its picture. The
// search box is in the top bar (business-header.tsx) and this list follows it.
//
// Sizes (Figma 2063:8869 phone, 1957:532 tablet, 1424:452 desktop): a product is 350px wide (the full width on a phone
// narrower than 382px) and at least 432px tall (the design's row height: a name on two lines fills it exactly). They
// wrap into as many columns as fit, 40px apart: one column, two once the page's content is 740px wide, three from 1130px, and
// a last row with fewer products is centered. These are container queries (the width of the content, not the window's): a
// window's width includes its scrollbar and the page's side padding, so with window breakpoints (800px, 1190px) the block could
// be a size for three columns while only two fit, leaving the filter at the left edge of a block whose cards were centered. The filter sits at the left
// edge of that block, 34px above the first row. On tablet and desktop the page has 30px around it.
//
// Not in the design, so placeholders: the words when there is nothing to show, and the filter's own popup (styled
// like the account menu, category-filter.tsx). A card leads to the product's own page (product/[id]/, Figma 2108:344).

const ALL = "";

export default function ProductList({ products, slug }: { products: PublicProduct[]; slug: string }) {
  const { query } = useSearch();
  const [category, setCategory] = useState(ALL);

  // Every category the business uses, alphabetical, each once (however it is spelled in capitals).
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of products) if (!seen.has(p.category.toLowerCase())) seen.set(p.category.toLowerCase(), p.category);
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filterOptions = useMemo(
    () => [{ value: ALL, text: "All" }, ...categories.map((c) => ({ value: c, text: c }))],
    [categories],
  );

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (category === ALL || p.category.toLowerCase() === category.toLowerCase()) &&
        (needle === "" || p.product_name.toLowerCase().includes(needle) || p.category.toLowerCase().includes(needle)),
    );
  }, [products, query, category]);

  return (
    <main className="@container mx-auto flex w-full flex-col px-4 pb-2.5 md:px-7.5 md:pt-7.5">
      {/* This block is as wide as the columns that fit (350, 740 or 1130px) and centered, so the filter lines up with the
          left edge of the first column. */}
      <div className="mx-auto w-full max-w-87.5 @min-[740px]:max-w-185 @min-[1130px]:max-w-282.5">
        <CategoryFilter value={category} options={filterOptions} onChange={setCategory} />

        {products.length === 0 && <p className="text-[14px] text-[#636363]">No products yet.</p>}
        {products.length > 0 && shown.length === 0 && <p className="text-[14px] text-[#636363]">No products match your search.</p>}

        <ul className="flex flex-wrap justify-center gap-10">
          {shown.map((product, index) => {
            const image = product.images.find((i) => i.is_primary) ?? product.images[0];
            return (
              <li key={product.id} className="min-h-108 w-full @min-[350px]:w-87.5">
                {/* The whole card (picture, name, price) leads to the product's own page (product/[id]). */}
                <Link href={`/${slug}/product/${product.id}`} className="block">
                {/* The picture is shown whole (never cropped) inside a grey box with a soft shadow. */}
                <div className="flex h-87.5 items-center justify-center bg-[#f9f9f9] p-6 shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
                  {image && (
                    <PlaceholderPicture
                      avif={image.urls.card.avif}
                      webp={image.urls.card.webp}
                      alt={product.product_name}
                      // The first few are on screen at once: load them at once. The rest wait until they come near.
                      loading={index < 3 ? "eager" : "lazy"}
                      className="size-full"
                      imgClassName="size-full object-contain"
                      placeholder={image.placeholder}
                      // Only for an image with no blurred preview: the loading sweep covers the whole card (-inset-6
                      // undoes its p-6), no colour of its own, so the card's grey shows.
                      blockClassName="-inset-6"
                    />
                  )}
                </div>
                <h2 className="pt-3.25 pb-0.75 text-[16px] leading-5.5 font-medium text-[#111] wrap-break-word">{product.product_name}</h2>
                <p className="text-[18px] leading-5.5 font-bold">{formatPrice(product.price)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
