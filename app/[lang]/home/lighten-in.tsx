"use client";

import { useLayoutEffect, useState } from "react";

// When the visitor comes from the business landing page by "Enter sqrtx" (business/enter-link.tsx leaves a note), the black of that page fades away from
// the page under the marketplace's top bar (half a second), as if the light were switched on. The top bar is not touched: its logo and links stay where they are.
// A layout effect, so the black is there before the first paint of the marketplace. Not for people who ask for less motion (globals.css).
const KEY = "sqrtx:from-landing";

export default function LightenIn() {
  const [on, setOn] = useState(false);

  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) !== "1") return;
      sessionStorage.removeItem(KEY);
    } catch {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- it has to be decided on the client, before the first paint
    setOn(true);
  }, []);

  if (!on) return null;
  return <div aria-hidden className="page-lighten" onAnimationEnd={() => setOn(false)} />;
}
