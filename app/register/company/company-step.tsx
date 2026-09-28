"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getBusinessCategories, getMyProfile, type BusinessCategory, type BusinessProfile } from "@/lib/business-profile";
import { getOnboardingState, homePath } from "@/lib/onboarding";
import { useRequireSession } from "@/lib/use-session";
import CompanyForm from "./company-form";

// Decides what CompanyForm shows: the empty form (first visit), the form filled with the saved profile (coming
// back from a later step), or a send-away for people who shouldn't be here. The form itself is always on screen;
// see CompanyForm's `pending` prop for what covers it until this is known.
export default function CompanyStep() {
  const router = useRouter();
  const session = useRequireSession();
  const [attempt, setAttempt] = useState(0); // "Try again" runs the loading again
  const [load, setLoad] = useState<{ status: "loading" } | { status: "error" } | { status: "ready"; profile: BusinessProfile | null; categories: BusinessCategory[] }>({
    status: "loading",
  });

  useEffect(() => {
    if (session !== "signed-in") return;
    let cancelled = false;
    (async () => {
      try {
        const state = await getOnboardingState();
        if (state.step === "done") return router.replace(await homePath(state)); // registration is finished
        const [profile, categories] = await Promise.all([getMyProfile(), getBusinessCategories()]); // profile: null on the first visit
        if (!cancelled) setLoad({ status: "ready", profile, categories });
      } catch {
        if (!cancelled) setLoad({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, attempt, router]);

  return (
    <CompanyForm
      // A fresh instance right as real data replaces the placeholder, so its fields (which only ever read `profile` and
      // `categories` once, when they're created) start from the real values instead of carrying over the empty placeholder ones.
      // Harmless: the placeholder was `inert`, so nothing could have been typed into it yet.
      key={load.status === "ready" ? "ready" : "pending"}
      profile={load.status === "ready" ? load.profile : null}
      categories={load.status === "ready" ? load.categories : []}
      pending={load.status === "loading" ? "loading" : load.status === "error" ? "error" : undefined}
      onRetry={() => {
        setLoad({ status: "loading" });
        setAttempt((n) => n + 1);
      }}
    />
  );
}
