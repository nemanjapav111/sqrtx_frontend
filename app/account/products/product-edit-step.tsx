"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { recall, remember } from "@/lib/memory-cache";
import { getOnboardingState, pathForStep } from "@/lib/onboarding";
import { getMyProduct, getProductCategories, type MyProduct } from "@/lib/products";
import { useRequireSession } from "@/lib/use-session";
import ProductEditForm from "./product-edit-form";

// `product` is null for a new product, and for an id that isn't the owner's (then `missing` is true).
type Ready = { status: "ready"; product: MyProduct | null; missing: boolean; categories: string[] };
type Load = { status: "loading" } | { status: "error" } | Ready;

// What this page loaded last time (see lib/memory-cache.ts): a product opened again from the list is shown filled in at
// once, and only checked for changes behind the scenes, instead of an empty, dimmed form under "Loading". Cleared by anything
// that saves or deletes a product (product-edit-form.tsx).
const PRODUCT_CACHE = "owner:product:"; // forgetOwnerProducts() in lib/memory-cache.ts clears everything under "owner:product"
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// The owner's product, or null when the API says it doesn't exist or isn't theirs (404).
async function findProduct(id: string): Promise<MyProduct | null> {
  try {
    return await getMyProduct(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// Decides what the edit page shows: the form filled with the product (`id`), or empty for a new one (`id` null), or a
// send-away for people who don't belong here (not signed in, registration not finished). The form itself is always on
// screen; see ProductEditForm's `pending` for what covers it until this is known.
export default function ProductEditStep({ id }: { id: string | null }) {
  const router = useRouter();
  const session = useRequireSession();
  const [attempt, setAttempt] = useState(0); // "Try again" runs the loading again
  const cacheKey = `${PRODUCT_CACHE}${id ?? "new"}`;
  const [load, setLoad] = useState<Load>(() => recall<Ready>(cacheKey) ?? { status: "loading" });

  useEffect(() => {
    if (session !== "signed-in") return;
    let cancelled = false;
    (async () => {
      try {
        // Everything is asked for at the same time as the registration check, not after it (each answer takes a while: one
        // after the other doubled the wait). A failure is only looked at when the answer is needed, after the check.
        const productAsked = id ? findProduct(id) : Promise.resolve(null);
        const categoriesAsked = getProductCategories();
        productAsked.catch(() => undefined);
        categoriesAsked.catch(() => undefined);
        const state = await getOnboardingState();
        if (state.step !== "done") return router.replace(pathForStep(state.step)); // registration is not finished

        // The form appears as soon as the product is here. The category list is the slowest answer and only the category box
        // needs it, so it fills in afterwards.
        const found = await productAsked;
        // Remembered even if the visitor has already left the page (an answer that arrived is true whoever is looking).
        const known = recall<Ready>(cacheKey)?.categories ?? [];
        remember(cacheKey, { status: "ready", product: found, missing: !!id && !found, categories: known } satisfies Ready);
        if (cancelled) return;
        setLoad((now) => {
          const categories = now.status === "ready" ? now.categories : [];
          // What was shown from the last visit is kept if the product is the same: the form is filled from that object, and
          // a new one would refill it, throwing away what was typed in the meantime.
          if (now.status === "ready" && sameJson(now.product, found)) return now;
          return { status: "ready", product: found, missing: !!id && !found, categories };
        });

        const categories = await categoriesAsked;
        const saved = recall<Ready>(cacheKey);
        if (saved) remember(cacheKey, { ...saved, categories });
        if (cancelled) return;
        setLoad((now) => {
          if (now.status !== "ready") return now;
          return sameJson(now.categories, categories) ? now : { ...now, categories };
        });
      } catch {
        // With the form already filled (from the last visit) a failed check is not worth an error box: it stays.
        if (!cancelled) setLoad((now) => (now.status === "ready" ? now : { status: "error" }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cacheKey is made from id
  }, [session, attempt, router, id]);

  // After a save that failed half way: load the products again, so the form shows what really is saved.
  const reloadProduct = useCallback(async () => {
    if (!id) return;
    try {
      const product = await findProduct(id);
      setLoad((now) => (now.status === "ready" ? { ...now, product, missing: !product } : now));
    } catch {
      // the form keeps what it has; the next save will show the problem
    }
  }, [id]);

  if (load.status === "ready" && load.missing) {
    return (
      <div className="flex flex-col items-center gap-4 px-5 pt-20 text-center">
        <p className="text-[16px] font-semibold">We couldn&apos;t find this product.</p>
        <Link href="/account/products" className="text-[14px] font-semibold underline">
          Back to your products
        </Link>
      </div>
    );
  }

  return (
    <ProductEditForm
      // A fresh instance right as real data replaces the placeholder, so its fields (which only ever read `product`
      // and `categories` once, when they're created) start from the real values instead of carrying over the empty
      // placeholder ones. Harmless: the placeholder was `inert`, so nothing could have been typed into it yet.
      key={load.status === "ready" ? "ready" : "pending"}
      editing={id !== null}
      product={load.status === "ready" ? load.product : null}
      categories={load.status === "ready" ? load.categories : []}
      pending={load.status === "loading" ? "loading" : load.status === "error" ? "error" : undefined}
      onRetry={() => {
        setLoad({ status: "loading" });
        setAttempt((n) => n + 1);
      }}
      onOutOfSync={reloadProduct}
    />
  );
}
