"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getBusinessCategories, getMyProfile, type BusinessCategory, type BusinessProfile } from "@/lib/business-profile";
import { recall, remember } from "@/lib/memory-cache";
import { getOnboardingState, homePath, pathForStep } from "@/lib/onboarding";
import { useRequireSession } from "@/lib/use-session";
import CompanyForm from "./company-form";

type Ready = { status: "ready"; profile: BusinessProfile | null; categories: BusinessCategory[] };
type Load = { status: "loading" } | { status: "error" } | Ready;

// The owner's profile form (variant "account") is remembered like the other owner pages (see lib/memory-cache.ts): opened
// again it is shown filled in at once and only checked for changes behind the scenes, instead of an empty, dimmed form under
// "Loading". Cleared when the profile is saved (company-form.tsx). Registration is not remembered: it is a one-off.
const PROFILE_CACHE = "owner:profile";
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Decides what CompanyForm shows: the empty form (first visit), the form filled with the saved profile (coming
// back from a later step), or a send-away for people who shouldn't be here. The form itself is always on screen;
// see CompanyForm's `pending` prop for what covers it until this is known.
// `variant` "account" is the owner editing the profile after registration (/account/profile): the rule is the other way
// round, only people who FINISHED registration belong there.
export default function CompanyStep({ variant = "registration" }: { variant?: "registration" | "account" }) {
  const router = useRouter();
  const session = useRequireSession();
  const [attempt, setAttempt] = useState(0); // "Try again" runs the loading again
  const [load, setLoad] = useState<Load>(() => (variant === "account" ? recall<Ready>(PROFILE_CACHE) : undefined) ?? { status: "loading" });

  useEffect(() => {
    if (session !== "signed-in") return;
    let cancelled = false;
    (async () => {
      try {
        // Asked for at the same time as the registration check, not after it (each answer takes a while; see product-edit-step.tsx).
        const data = Promise.all([getMyProfile(), getBusinessCategories()]); // profile: null on the first visit
        data.catch(() => undefined);
        const state = await getOnboardingState();
        if (variant === "account") {
          if (state.step !== "done") return router.replace(pathForStep(state.step)); // registration is not finished
        } else if (state.step === "done") {
          return router.replace(await homePath(state)); // registration is finished
        }
        const [profile, categories] = await data;
        const fresh: Ready = { status: "ready", profile, categories };
        if (variant === "account") remember(PROFILE_CACHE, fresh);
        if (cancelled) return;
        // What was shown from the last visit is kept if nothing changed: the form is filled from the profile once, and a new
        // object must not replace what the visitor has typed since.
        setLoad((now) => (now.status === "ready" && sameJson(now, fresh) ? now : fresh));
      } catch {
        // With the form already filled (from the last visit) a failed check is not worth an error box: it stays.
        if (!cancelled) setLoad((now) => (now.status === "ready" ? now : { status: "error" }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, attempt, router, variant]);

  return (
    <CompanyForm
      // A fresh instance right as real data replaces the placeholder, so its fields (which only ever read `profile` and
      // `categories` once, when they're created) start from the real values instead of carrying over the empty placeholder ones.
      // Harmless: the placeholder was `inert`, so nothing could have been typed into it yet.
      key={load.status === "ready" ? "ready" : "pending"}
      variant={variant}
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
