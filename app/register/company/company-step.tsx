"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BigLogo from "@/app/components/big-logo";
import { GENERIC_ERROR } from "@/lib/auth-messages";
import { getMyProfile, type BusinessProfile } from "@/lib/business-profile";
import { getOnboardingState, pathForStep } from "@/lib/onboarding";
import { useRequireSession } from "@/lib/use-session";
import CompanyForm from "./company-form";

// Decides what this page shows: the empty form (first visit), the form filled with the saved profile
// (coming back from a later step), or a send-away for people who shouldn't be here.
export default function CompanyStep() {
  const router = useRouter();
  const session = useRequireSession();
  const [attempt, setAttempt] = useState(0); // "Try again" runs the loading again
  const [load, setLoad] = useState<{ status: "loading" } | { status: "error" } | { status: "ready"; profile: BusinessProfile | null }>({
    status: "loading",
  });

  useEffect(() => {
    if (session !== "signed-in") return;
    let cancelled = false;
    (async () => {
      try {
        const state = await getOnboardingState();
        if (state.step === "done") return router.replace(pathForStep("done")); // registration is finished
        const profile = await getMyProfile(); // null on the first visit
        if (!cancelled) setLoad({ status: "ready", profile });
      } catch {
        if (!cancelled) setLoad({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, attempt, router]);

  if (load.status === "ready") return <CompanyForm profile={load.profile} />;

  return (
    <>
      <BigLogo />
      {load.status === "loading" ? (
        <p className="pt-9.5 font-semibold">Loading…</p>
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
