"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getOnboardingState, pathForStep } from "@/lib/onboarding";
import { supabase } from "@/lib/supabase";

// For the login and register pages: someone whose browser still has a session doesn't need them, so they are sent to
// their registration step, the same place a successful log in goes. Returns true while that is happening, so the page
// can hide its form instead of showing it for a moment.
// It only looks at the session that was already there when the page opened. (A session that appears later, like the
// one from signing in on this very page, is handled by the page itself.)
// If we can't tell where they belong (expired session, no connection), the page just stays as it is.
export function useRedirectIfSignedIn(): boolean {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || cancelled) return;
      setRedirecting(true);
      try {
        const state = await getOnboardingState();
        if (!cancelled) router.replace(pathForStep(state.step)); // replace: Back shouldn't return to the page they skipped
      } catch {
        if (!cancelled) setRedirecting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return redirecting;
}
