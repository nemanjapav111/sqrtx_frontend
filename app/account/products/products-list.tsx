"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import CategoryFilter from "@/app/[slug]/category-filter";
import BigLogo from "@/app/components/big-logo";
import PendingOverlay from "@/app/components/pending-overlay";
import { GENERIC_ERROR } from "@/lib/auth-messages";
import { recall, remember } from "@/lib/memory-cache";
import { getOnboardingState, pathForStep } from "@/lib/onboarding";
import { formatPrice, getMyProductsPage, type MyProduct } from "@/lib/products";
import { useAfterDelay } from "@/lib/use-after-delay";
import { useRequireSession } from "@/lib/use-session";

type Ready = { status: "ready"; items: MyProduct[]; total: number; page: number; categories: string[] };
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

// The owner's list of their products (all of them, also the ones the public can't see), each leading to its edit page.
// Built for hundreds of products: a search box (name or category), a category filter and "Show more" (20 at a time), all
// done by the API, so the list never loads more than a page. No design for this page: it follows the account pages, and
// its wording is placeholder. The page is shown at once, empty, under a PendingOverlay while the products load.
export default function ProductsList() {
  // The remembered search only exists in the browser. Reading it while the page is built on the server would give a
  // different first picture than the browser's (a warning, and a flash of the wrong search text), so the list itself
  // is only drawn in the browser; the title is drawn at once.
  const inBrowser = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  if (!inBrowser) {
    return (
      <>
        <BigLogo />
        <h1 className="pt-9.5 pb-10 text-[20px] font-semibold md:pt-6 md:pb-6">Your products</h1>
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
        if (cancelled) return;
        // The category that was remembered may be gone (its last product was deleted): then show all.
        if (category && !result.categories.some((c) => c.toLowerCase() === category.toLowerCase())) return setCategory("");
        setMoreError(false);
        const ready: Ready = { status: "ready", items: result.items, total: result.total, page: 1, categories: result.categories };
        remember(listKey(search, category), ready);
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
  // Blocked (inert) at once, but only looks dimmed, with the "Loading" box, if it takes a moment (an error shows at once).
  const showPending = useAfterDelay(pending === "loading", 200) || pending === "error";
  const items = load.status === "ready" ? load.items : [];
  const total = load.status === "ready" ? load.total : 0;
  const filtering = search !== "" || category !== "";
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
          className={`flex w-full flex-col gap-5 px-5 pb-10 transition-opacity duration-200 md:pb-6 ${showPending ? "opacity-40" : ""}`}
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
            {load.status === "ready" && (
              <p role="status" className="text-right text-[13px] font-medium text-[#4b5563]">
                {filtering ? `${total} found` : `${total} ${total === 1 ? "product" : "products"}`}
              </p>
            )}
          </div>

          {load.status === "ready" && items.length === 0 && (
            <p className="text-[14px] text-[#636363]">
              {filtering ? "No products match your search." : "You haven't added any products yet."}
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {items.map((product) => {
              const image = [...product.images].sort((a, b) => a.sort_order - b.sort_order)[0];
              return (
                <li key={product.id}>
                  <Link
                    href={`/account/products/${product.id}`}
                    className="flex items-center gap-4 border border-[#b8b8b8] p-2 hover:bg-[#4b5563]/10"
                  >
                    <div className="size-16 shrink-0 bg-[#f9f9f9]">
                      {image && (
                        // eslint-disable-next-line @next/next/no-img-element -- the API's files are already optimized (see API.md)
                        <img src={image.urls.card.webp} alt="" loading="lazy" className="size-full object-contain" />
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

        {pending && showPending && (
          <PendingOverlay
            state={pending}
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
