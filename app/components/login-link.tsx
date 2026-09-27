"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { getOnboardingState, pathForStep } from "@/lib/onboarding";
import { supabase } from "@/lib/supabase";

// The landing page's "Log in" link. A visitor with no session goes to the login form, same as a plain link would.
// Someone who is already signed in (their browser still has a session) skips the form and goes straight to their
// registration step, the same place LoginForm itself sends them right after signing in.
export default function LoginLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const inFlight = useRef(false); // ignores a second click while the first is still deciding where to go

  async function go() {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.push("/login");
      try {
        const state = await getOnboardingState();
        router.push(pathForStep(state.step));
      } catch {
        // Couldn't tell where they belong (expired session, no connection, ...): the login form is the safe fallback.
        router.push("/login");
      }
    } finally {
      inFlight.current = false;
    }
  }

  return (
    // onNavigate (not onClick) so a modified click - Ctrl/Cmd, opening in a new tab - is left alone; Next only calls
    // it for a plain, same-tab click. It has to preventDefault synchronously, before this async work is even
    // started, so the router push below always fires instead of Link's own navigation to href.
    <Link
      href="/login"
      onNavigate={(e) => {
        e.preventDefault();
        void go();
      }}
      className={className}
    >
      {children}
    </Link>
  );
}
