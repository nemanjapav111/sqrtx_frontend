"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BigLogo from "@/app/components/big-logo";
import Loading from "@/app/components/loading";
import { GENERIC_ERROR } from "@/lib/auth-messages";
import { getOnboardingState, pathForStep } from "@/lib/onboarding";
import { getProductCategories } from "@/lib/products";
import { useRequireSession } from "@/lib/use-session";
import ProductForm from "./product-form";

// Decides what this page shows: the empty product form, or a send-away for people who don't belong here
// (registration finished, the business profile isn't saved yet, or their business only offers services).
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
        if (state.step === "done" || !state.steps.includes("products")) return router.replace(pathForStep(state.step));
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

  if (load.status === "ready") return <ProductForm categories={load.categories} />;

  return (
    <>
      <BigLogo />
      {load.status === "loading" ? (
        <div className="pt-9.5">
          <Loading />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 px-5 pt-9.5 text-center">
          <p role="alert" className="text-red-600">
            {GENERIC_ERROR}
          </p>
          <button
            type="button"
            onClick={() => {
              setLoad({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
            className="w-46.5 cursor-pointer border-2 border-black py-2.25 font-bold"
          >
            Try again
          </button>
        </div>
      )}
    </>
  );
}
