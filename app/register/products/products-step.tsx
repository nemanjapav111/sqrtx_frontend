"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getOnboardingState, homePath } from "@/lib/onboarding";
import { getProductCategories } from "@/lib/products";
import { useRequireSession } from "@/lib/use-session";
import ProductForm from "./product-form";

// Decides what ProductForm shows: the empty product form, or a send-away for people who don't belong here
// (registration finished, the business profile isn't saved yet, or their business only offers services). The form
// itself is always on screen; see ProductForm's `pending` prop for what covers it until this is known.
export default function ProductsStep() {
  const router = useRouter();
  const session = useRequireSession();
  const [attempt, setAttempt] = useState(0); // "Try again" runs the loading again
  const [load, setLoad] = useState<{ status: "loading" } | { status: "error" } | { status: "ready"; categories: string[] }>({
    status: "loading",
  });

  useEffect(() => {
    if (session !== "signed-in") return;
    let cancelled = false;
    (async () => {
      try {
        const state = await getOnboardingState();
        // Coming back to this page from a later step is fine, as long as products are part of the user's path.
        // Before the profile is saved that path is just the first page, so this also sends them there.
        if (state.step === "done" || !state.steps.includes("products")) return router.replace(await homePath(state));
        const categories = await getProductCategories(); // what products use, most used first
        if (!cancelled) setLoad({ status: "ready", categories });
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
      // A fresh instance right as real data replaces the placeholder, so its category list (which only ever reads
      // the `categories` prop once, when it's created) starts from the real list instead of carrying over the empty
      // placeholder one. Harmless: the placeholder was `inert`, so nothing could have been typed into it yet.
      key={load.status === "ready" ? "ready" : "pending"}
      categories={load.status === "ready" ? load.categories : []}
      pending={load.status === "loading" ? "loading" : load.status === "error" ? "error" : undefined}
      onRetry={() => {
        setLoad({ status: "loading" });
        setAttempt((n) => n + 1);
      }}
    />
  );
}
