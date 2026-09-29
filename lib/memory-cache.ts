import { supabase } from "@/lib/supabase";

// What the owner's pages (account, products, edit product, business profile) loaded last, kept in memory for as long as this
// browser tab stays open. Opening such a page again then shows what was there at once and only checks for news behind
// the scenes ("stale while revalidate"), instead of dimming the page under a "Loading" box every time although the same data
// was on screen a moment ago. Nothing is stored on disk.
//
// It belongs to whoever is signed in: it is emptied when someone signs out or another account signs in, so the next
// person in the same tab can never see it. Whatever is saved or deleted must call forget() for what it changed.
const store = new Map<string, unknown>();
let owner: string | null = null;

export const recall = <T>(key: string): T | undefined => store.get(key) as T | undefined;

export const remember = (key: string, value: unknown) => {
  store.set(key, value);
};

/** Removes everything whose name starts with `prefix` (or everything, with no prefix). */
export function forget(prefix = "") {
  for (const key of [...store.keys()]) if (key.startsWith(prefix)) store.delete(key);
}

/** Everything remembered about the owner's products (their list and each product's page): call it after anything saved or deleted one. */
export const forgetOwnerProducts = () => forget("owner:product");

/** Everything remembered about the owner's profile (its form, and the account page that shows its address): call it after saving the profile. */
export const forgetOwnerProfile = () => {
  forget("owner:profile");
  forget("owner:account");
};

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      owner = null;
      forget();
    } else if (session && session.user.id !== owner) {
      if (owner !== null) forget(); // another account: nothing of the last one may stay
      owner = session.user.id;
    }
  });
}
