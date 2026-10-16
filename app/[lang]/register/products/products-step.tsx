"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Dictionary } from "@/app/[lang]/dictionaries/en";
import { getOnboardingState, homePath } from "@/lib/onboarding";
import { getProductCategories } from "@/lib/products";
import { getMyCurrency } from "@/lib/my-currency";
import { DEFAULT_CURRENCY } from "@/lib/price";
import { useRequireSession } from "@/lib/use-session";
import ProductForm from "./product-form";

// Decides what ProductForm shows: the empty product form, or a send-away for people who don't belong here
// (registration finished, the business profile isn't saved yet, or their business only offers services). The form
// itself is always on screen; see ProductForm's `pending` prop for what covers it until this is known.
export default function ProductsStep({ text }: { text: Dictionary["registration"]["products"] }) {
  const router = useRouter();
  const session = useRequireSession();
  const [attempt, setAttempt] = useState(0); // "Try again" runs the loading again
  const [load, setLoad] = useState<{ status: "loading" } | { status: "error" } | { status: "ready"; categories: string[]; currency: string }>({
    status: "loading",
  });

  useEffect(() => {
    if (session !== "signed-in") return;
    let cancelled = false;
    (async () => {
      try {
        // Asked for at the same time as the registration check, not after it (neither answer needs the other; see company-step.tsx).
        // If the check sends the visitor elsewhere this answer is simply not used.
        const categoriesAsked = getProductCategories(); // what products use, most used first
        categoriesAsked.catch(() => undefined);
        const currencyAsked = getMyCurrency(); // the currency of the business, for the price box
        currencyAsked.catch(() => undefined);
        const state = await getOnboardingState();
        // Coming back to this page from a later step is fine, as long as products are part of the user's path.
        // Before the profile is saved that path is just the first page, so this also sends them there.
        if (state.step === "done" || !state.steps.includes("products")) {
          const to = await homePath(state);
          if (!cancelled) router.replace(to); // not if they have left this page meanwhile
          return;
        }
        const [categories, currency] = await Promise.all([categoriesAsked, currencyAsked]);
        if (!cancelled) setLoad({ status: "ready", categories, currency });
      } catch {
        if (!cancelled) setLoad({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, attempt, router]);

  return (
    <ProductForm
      text={text}
      // A fresh instance right as real data replaces the placeholder, so its category list (which only ever reads
      // the `categories` prop once, when it's created) starts from the real list instead of carrying over the empty
      // placeholder one. Harmless: the placeholder was `inert`, so nothing could have been typed into it yet.
      key={load.status === "ready" ? "ready" : "pending"}
      categories={load.status === "ready" ? load.categories : []}
      currency={load.status === "ready" ? load.currency : DEFAULT_CURRENCY}
      pending={load.status === "loading" ? "loading" : load.status === "error" ? "error" : undefined}
      onRetry={() => {
        setLoad({ status: "loading" });
        setAttempt((n) => n + 1);
      }}
    />
  );
}
