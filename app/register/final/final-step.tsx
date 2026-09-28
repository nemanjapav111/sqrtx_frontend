"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LogoutButton from "@/app/components/logout-button";
import { getOnboardingState, pathForStep } from "@/lib/onboarding";
import { useRequireSession } from "@/lib/use-session";
import ArrowIcon from "../arrow-icon";
import FinalForm from "./final-form";

// Decides what FinalForm shows: the empty form (first visit), or a send-away for people who don't belong here
// (registration already finished, or they haven't reached this step yet). The form itself is always on screen;
// see FinalForm's `pending` prop for what covers it until this is known.
export default function FinalStep() {
  const router = useRouter();
  const session = useRequireSession();
  const [attempt, setAttempt] = useState(0); // "Try again" runs the loading again
  const [load, setLoad] = useState<{ status: "loading" } | { status: "error" } | { status: "ready" }>({ status: "loading" });
  // This is reached from whichever step actually precedes "final" on this user's path (company, products or
  // services, depending on what the business offers) - "/register/company" is a reasonable default until the
  // real path is known.
  const [backHref, setBackHref] = useState("/register/company");

  useEffect(() => {
    if (session !== "signed-in") return;
    let cancelled = false;
    (async () => {
      try {
        const state = await getOnboardingState();
        const before = state.steps[state.steps.indexOf("final") - 1];
        if (!cancelled && before) setBackHref(pathForStep(before));
        // Coming back to this page once registration is already done sends them to the normal site instead.
        if (state.step !== "final") return router.replace(pathForStep(state.step));
        if (!cancelled) setLoad({ status: "ready" });
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
      <div className="absolute top-0.75 right-3 md:right-[calc(50%-262px)]">
        <LogoutButton />
      </div>
      <FinalForm
        // A fresh instance right as real data replaces the placeholder: harmless, since the placeholder was
        // `inert` and nothing could have been typed into it yet (see ProductForm/ServiceForm for the same pattern).
        key={load.status === "ready" ? "ready" : "pending"}
        pending={load.status === "loading" ? "loading" : load.status === "error" ? "error" : undefined}
        onRetry={() => {
          setLoad({ status: "loading" });
          setAttempt((n) => n + 1);
        }}
      />
    </>
  );
}
