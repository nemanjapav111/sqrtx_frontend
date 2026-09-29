import { useEffect, useState } from "react";

/**
 * True once `active` has stayed true for `ms`; false as soon as it is false. For a loading state: a page that loads in a
 * fraction of a second should not flash its dimmed "Loading" look for that fraction (it reads as a flicker), only one that
 * really takes a while should show it. The page is still blocked (`inert`) from the first moment; only the look waits.
 */
export function useAfterDelay(active: boolean, ms: number): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setElapsed(true), ms);
    return () => {
      clearTimeout(timer);
      setElapsed(false);
    };
  }, [active, ms]);
  return active && elapsed;
}
