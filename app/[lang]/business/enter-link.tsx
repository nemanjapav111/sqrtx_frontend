"use client";

import Link from "next/link";

// The landing page's "Enter sqrtx" link. It leaves a note in the tab's session storage, so the marketplace (app/home/lighten-in.tsx) knows the visitor comes from this
// black page and can let the light in: the black fades away from the page under the top bar, which stays as it is.
export const FROM_LANDING_KEY = "sqrtx:from-landing";

export default function EnterLink({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Link
      href="/"
      className={className}
      onClick={() => {
        try {
          sessionStorage.setItem(FROM_LANDING_KEY, "1");
        } catch {
          // no storage (private window, blocked): the marketplace just opens without the fade
        }
      }}
    >
      {children}
    </Link>
  );
}
