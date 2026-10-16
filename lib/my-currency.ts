import { useEffect, useState } from "react";
import { getMyProfile } from "@/lib/business-profile";
import { recall, remember } from "@/lib/memory-cache";
import { DEFAULT_CURRENCY } from "@/lib/price";

// The currency of the signed-in owner's prices (their business's currency): the price boxes show its symbol and their lists write their prices with it.
// Kept in memory like the owner's other pages (lib/memory-cache.ts); forgetOwnerProfile() empties it when the profile is saved, because "owner:profile" starts its name.
const KEY = "owner:profile:currency";

export async function getMyCurrency(): Promise<string> {
  const known = recall<string>(KEY);
  if (known) return known;
  // Only the price box's symbol depends on this, so a failed answer must not stop the page: USD, and it is asked again next time.
  const profile = await getMyProfile().catch(() => null);
  if (!profile) return DEFAULT_CURRENCY; // no profile yet, or no answer: nothing to remember
  const currency = profile.currency || DEFAULT_CURRENCY; // an API without currencies yet: USD
  remember(KEY, currency);
  return currency;
}

/** The owner's currency for a page: what was remembered at once (USD the very first time), then the real one when it arrives. `enabled`: the visitor is signed in. */
export function useMyCurrency(enabled: boolean): string {
  const [currency, setCurrency] = useState(() => recall<string>(KEY) ?? DEFAULT_CURRENCY);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getMyCurrency().then(
      (found) => {
        if (!cancelled) setCurrency(found);
      },
      () => undefined, // the page's own loading shows any problem with the connection
    );
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return currency;
}
