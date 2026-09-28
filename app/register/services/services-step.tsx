"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getOnboardingState, homePath } from "@/lib/onboarding";
import { getServiceCategories } from "@/lib/services";
import { useRequireSession } from "@/lib/use-session";
import ArrowIcon from "../arrow-icon";
import ServiceForm from "./service-form";

// Decides what ServiceForm shows: the empty form (first visit), or a send-away for people who don't belong here
// (registration finished, or their business only offers products, or they haven't saved a business profile yet).
// The form itself is always on screen; see ServiceForm's `pending` prop for what covers it until this is known.
export default function ServicesStep() {
  const router = useRouter();
  const session = useRequireSession();
  const [attempt, setAttempt] = useState(0); // "Try again" runs the loading again
  const [load, setLoad] = useState<{ status: "loading" } | { status: "error" } | { status: "ready"; categories: string[] }>({
    status: "loading",
  });
  // This page is reached two ways: business profile -> services (no products step) or business profile -> products
  // -> services. Back should undo whichever of those actually happened; "/register/products" is the more common
  // case and a reasonable default until the real path is known.
  const [backHref, setBackHref] = useState("/register/products");

  useEffect(() => {
    if (session !== "signed-in") return;
    let cancelled = false;
    (async () => {
      try {
        const state = await getOnboardingState();
        if (!cancelled) setBackHref(state.steps.includes("products") ? "/register/products" : "/register/company");
        // Coming back to this page from a later step is fine, as long as services are part of the user's path.
        if (state.step === "done" || !state.steps.includes("services")) return router.replace(await homePath(state));
        const categories = await getServiceCategories(); // what services use, most used first
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
    <>
      <Link href={backHref} aria-label="Back" className="absolute top-0.75 left-1.5 px-2.5 py-2 md:left-[calc(50%-260px)]">
        <ArrowIcon className="h-7 w-6 rotate-180" />
      </Link>
      <ServiceForm
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
    </>
  );
}
