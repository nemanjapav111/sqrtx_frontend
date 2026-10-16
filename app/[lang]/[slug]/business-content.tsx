"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { hasVisited } from "./path-tracker";

// Whether the lists (products, services) pop in (globals.css, .business-in) when they are shown. They do when the visitor ARRIVES at the business from another
// page of sqrtx, once: not on a fresh load or a refresh (no page was shown before: hasVisited), and not when moving between the business's own tabs. The box
// stays here, around all the business's pages, so the lists can ask it; only the list itself pops (not the filter's dropdown above it).
const Arrival = createContext<{ isPending: () => boolean; clear: () => void }>({ isPending: () => false, clear: () => {} });

export default function BusinessContent({ className, children }: { className: string; children: React.ReactNode }) {
  const [arrival] = useState(() => {
    let pending = hasVisited();
    return { isPending: () => pending, clear: () => void (pending = false) };
  });
  return (
    <Arrival.Provider value={arrival}>
      <div className={className}>{children}</div>
    </Arrival.Provider>
  );
}

/** True for the list that is the first page shown after arriving at the business; false for every later one. */
export function useArrivalPop() {
  const arrival = useContext(Arrival);
  const [pop] = useState(arrival.isPending);
  useEffect(() => {
    if (pop) arrival.clear();
  }, [arrival, pop]);
  return pop;
}
