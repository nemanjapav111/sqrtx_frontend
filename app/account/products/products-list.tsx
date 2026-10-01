"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import CategoryFilter from "@/app/[slug]/category-filter";
import BigLogo from "@/app/components/big-logo";
import PendingOverlay from "@/app/components/pending-overlay";
import PlaceholderPicture from "@/app/components/placeholder-picture";
import { GENERIC_ERROR } from "@/lib/auth-messages";
import { recall, remember } from "@/lib/memory-cache";
import { getOnboardingState, pathForStep } from "@/lib/onboarding";
import { formatPrice } from "@/lib/price";
import { getMyProductsPage, type MyProduct } from "@/lib/products";
import { useRequireSession } from "@/lib/use-session";

// `key`: the search and category these products are for (see listKey), so a count left over from the LAST search is never taken for this one's.
type Ready = { status: "ready"; key: string; items: MyProduct[]; total: number; page: number; categories: string[] };
type Load = { status: "loading" } | { status: "error" } | Ready;

// The first page of a search, as it was last time (see lib/memory-cache.ts): coming back from an edit page shows the list at
// once and asks the API again behind the scenes, instead of dimming it under "Loading". Cleared by anything that saves or
// deletes a product (product-edit-form.tsx).
const PRODUCTS_LIST_CACHE = "owner:products-list:"; // forgetOwnerProducts() in lib/memory-cache.ts clears everything under "owner:product"
const listKey = (q: string, category: string) => `${PRODUCTS_LIST_CACHE}${q}|${category}`;

// What was searched and chosen is kept for this browser tab, so coming back from an edit page lands on the same list
// (the products loaded with "Show more" are not kept: the list starts again from the first page).
const FILTER_KEY = "sqrtx:my-products-filter";
const SEARCH_DELAY_MS = 300;

function readFilter(): { q: string; category: string } {
  try {
    const saved = JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? "null") as { q?: string; category?: string } | null;
    return { q: saved?.q ?? "", category: saved?.category ?? "" };
  } catch {
    return { q: "", category: "" }; // no storage (private window): the list just starts unfiltered
  }
}
const subscribeToNothing = () => () => {};

// Grey rows standing in for the products while they load: the same shape as a real row (a box with a small picture and two lines of
// text), breathing (see `breathe` in globals.css).
function SkeletonRows() {
  return (
    <>
      {[0, 1, 2].map((n) => (
        <li key={n} aria-hidden className="breathe flex items-center gap-4 border border-[#b8b8b8] p-2">
          <div className="size-16 shrink-0 bg-[#e5e7eb]" />
          <div className="flex flex-col gap-2">
            <div className="h-4 w-40 rounded-sm bg-[#e5e7eb]" />
            <div className="h-3.5 w-28 rounded-sm bg-[#e5e7eb]" />
          </div>
        </li>
      ))}
    </>
  );
}

// The owner's list of their products (all of them, also the ones the public can't see), each leading to its edit page.
// Built for hundreds of products: a search box (name or category), a category filter and "Show more" (20 at a time), all
// done by the API, so the list never loads more than a page. No design for this page: it follows the account pages, and
// its wording is placeholder. The page is shown at once while the products load, with grey rows that breathe where they will be
// (no spinner, no dimming, however long it takes); only a failure dims it and says so (PendingOverlay, with "Try again").
export default function ProductsList() {
  // The remembered search only exists in the browser. Reading it while the page is built on the server would give a
  // different first picture than the browser's (a warning, and a flash of the wrong search text), so the list itself
  // is only drawn in the browser. What is on screen before that (the page's first HTML, from the first moment) is its loading
  // state in the same sizes: the title, the "Add product" button and the search box, then grey placeholders for the filter, the number of products and the rows.
  // The real page replaces it as soon as the browser's code has run.
  const inBrowser = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  if (!inBrowser) {
    return (
      <>
        <BigLogo />
        <h1 className="pt-9.5 pb-10 text-[20px] font-semibold md:pt-6 md:pb-6">Your products</h1>
        <div className="flex w-full max-w-135 flex-col">
          <div className="flex w-full flex-col gap-5 px-5 pb-10 md:pb-6">
            {/* The same two controls as the real page, there from the first moment ("Add product" already leads to its page; the
                search box is for show until the real one replaces it, so nothing typed into it could be lost), then the grey
                placeholders for the filter and the rows. */}
            <Link
              href="/account/products/new"
              className="flex h-11 w-full items-center justify-center border-2 border-black bg-white text-[14px] font-bold"
            >
              Add product
            </Link>
            <input
              type="search"
              aria-label="Search your products"
              placeholder="Search by name or category"
              readOnly
              tabIndex={-1}
              className="h-11 w-full border border-black px-2 text-[16px] outline-none placeholder:text-[#8f8f8f]"
            />
            <div aria-hidden className="flex h-20.5 items-center justify-between gap-3">
              <div className="mb-8.5 flex h-12 items-center pl-7">
                <div className="breathe h-3 w-24 rounded-sm bg-[#e5e7eb]" />
              </div>
              <div className="breathe h-3.5 w-20 shrink-0 rounded-sm bg-[#e5e7eb]" />
            </div>
            <ul className="flex flex-col gap-3">
              <SkeletonRows />
            </ul>
          </div>
        </div>
      </>
    );
  }
  return <ProductsListInBrowser />;
}

function ProductsListInBrowser() {
  const router = useRouter();
  const session = useRequireSession();
  const [attempt, setAttempt] = useState(0); // "Try again" runs the loading again
  const [initial] = useState(readFilter);
  const [load, setLoad] = useState<Load>(() => recall<Ready>(listKey(initial.q, initial.category)) ?? { status: "loading" });
  const [typed, setTyped] = useState(initial.q); // what is in the search box
  const [search, setSearch] = useState(initial.q); // what is searched: `typed`, a moment after the typing stopped
  const [category, setCategory] = useState(initial.category);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(typed.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [typed]);

  useEffect(() => {
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify({ q: search, category }));
    } catch {
      // ignored: only a convenience
    }
  }, [search, category]);

  // The first page for the current search and category. A newer search makes an older answer obsolete (cancelled).
  useEffect(() => {
    if (session !== "signed-in") return;
    let cancelled = false;
    (async () => {
      try {
        // Asked for at the same time as the registration check, not after it (see product-edit-step.tsx).
        const data = getMyProductsPage({ q: search, category, page: 1 });
        data.catch(() => undefined);
        const state = await getOnboardingState();
        if (state.step !== "done") return router.replace(pathForStep(state.step)); // registration is not finished
        const result = await data;
        const ready: Ready = { status: "ready", key: listKey(search, category), items: result.items, total: result.total, page: 1, categories: result.categories };
        remember(listKey(search, category), ready); // even if the visitor has already left: an answer that arrived is true
        if (cancelled) return;
        // The category that was remembered may be gone (its last product was deleted): then show all.
        if (category && !result.categories.some((c) => c.toLowerCase() === category.toLowerCase())) return setCategory("");
        setMoreError(false);
        setLoad(ready);
      } catch {
        // With a list already on screen (from the last visit) a failed check is not worth an error box: it stays.
        if (!cancelled) setLoad((now) => (now.status === "ready" ? now : { status: "error" }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, search, category, attempt, router]);

  async function showMore() {
    if (load.status !== "ready" || loadingMore) return;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const result = await getMyProductsPage({ q: search, category, page: load.page + 1 });
      setLoad((now) =>
        now.status === "ready"
          ? { ...now, items: [...now.items, ...result.items.filter((p) => !now.items.some((have) => have.id === p.id))], total: result.total, page: load.page + 1 }
          : now,
      );
    } catch {
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  const pending = load.status === "ready" ? undefined : load.status;
  const loading = pending === "loading";
  const failed = pending === "error";
  const items = load.status === "ready" ? load.items : [];
  const total = load.status === "ready" ? load.total : 0;
  const filtering = search !== "" || category !== "";
  // Whether the number of products is not known yet: while the page loads, and again from the moment a new search or category is
  // asked for until its answer arrives (the list stays as it was meanwhile, but its number would be the old search's).
  // Whether the list ON SCREEN is a filtered one. The empty message follows this, not `filtering`: after the search box is cleared the old
  // (empty) result stays until the new answer arrives, and the message must not already say "You haven't added any products yet" over it.
  const shownFiltered = load.status === "ready" && load.key !== listKey("", "");
  const counting = load.status !== "ready" || load.key !== listKey(search, category) || typed.trim() !== search;
  const options = useMemo(
    () => [{ value: "", text: "All" }, ...(load.status === "ready" ? load.categories : []).map((c) => ({ value: c, text: c }))],
    [load],
  );

  return (
    <>
      <BigLogo />
      <h1 className="pt-9.5 pb-10 text-[20px] font-semibold md:pt-6 md:pb-6">Your products</h1>

      <div className="relative flex w-full max-w-135 flex-col">
        <div
          inert={!!pending}
          className={`flex w-full flex-col gap-5 px-5 pb-10 transition-opacity duration-200 md:pb-6 ${failed ? "opacity-40" : ""}`}
        >
          <Link
            href="/account/products/new"
            className="flex h-11 w-full items-center justify-center border-2 border-black bg-white text-[14px] font-bold"
          >
            Add product
          </Link>

          <input
            type="search"
            aria-label="Search your products"
            placeholder="Search by name or category"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="h-11 w-full border border-black px-2 text-[16px] outline-none placeholder:text-[#8f8f8f] focus:shadow-[0_0_0_1px_black]"
          />
          <div className="flex items-center justify-between gap-3">
            <CategoryFilter value={category} options={options} onChange={setCategory} />
            {counting ? (
              <div aria-hidden className="breathe h-3.5 w-20 shrink-0 rounded-sm bg-[#e5e7eb]" />
            ) : (
              <p role="status" className="text-right text-[13px] font-medium text-[#4b5563]">
                {filtering ? `${total} found` : `${total} ${total === 1 ? "product" : "products"}`}
              </p>
            )}
          </div>

          {load.status === "ready" && items.length === 0 && (
            <p className="text-[14px] text-[#636363]">
              {shownFiltered ? "No products match your search." : "You haven't added any products yet."}
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {loading && <SkeletonRows />}
            {items.map((product, index) => {
              const image = [...product.images].sort((a, b) => a.sort_order - b.sort_order)[0];
              return (
                <li key={product.id}>
                  <Link
                    href={`/account/products/${product.id}`}
                    className="flex items-center gap-4 border border-[#b8b8b8] p-2 hover:bg-[#4b5563]/10"
                  >
                    <div className="size-16 shrink-0 bg-[#f9f9f9]">
                      {image && (
                        // The same picture as the public page's cards: a blurred preview while it loads, none for one already
                        // seen, and decoded before it is painted (see placeholder-picture.tsx). The rows in view load at once (a
                        // lazy one is only started after the row has been laid out, a moment in which a picture that is already
                        // in the browser's cache would still show an empty box); the rest wait until they come near.
                        <PlaceholderPicture
                          avif={image.urls.card.avif}
                          webp={image.urls.card.webp}
                          alt=""
                          placeholder={image.placeholder}
                          loading={index < 8 ? "eager" : "lazy"}
                          className="size-full"
                          imgClassName="size-full object-contain"
                        />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="text-[16px] leading-tight font-semibold wrap-break-word">{product.product_name}</span>
                      <span className="text-[14px] text-[#4b5563]">
                        {product.category} · {formatPrice(product.price)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {load.status === "ready" && items.length < total && (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={showMore}
                disabled={loadingMore}
                className="flex h-11 w-full cursor-pointer items-center justify-center border-2 border-black bg-white text-[14px] font-bold disabled:cursor-wait disabled:opacity-60"
              >
                {loadingMore ? "Loading…" : `Show more (${total - items.length} left)`}
              </button>
              {moreError && (
                <p role="alert" className="text-[14px] text-red-600">
                  {GENERIC_ERROR}
                </p>
              )}
            </div>
          )}
        </div>

        {failed && (
          <PendingOverlay
            state="error"
            onRetry={() => {
              setLoad({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
          />
        )}
      </div>
    </>
  );
}
