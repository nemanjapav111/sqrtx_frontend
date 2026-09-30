// Whether this browser holds a saved login, WITHOUT loading the login library (lib/supabase.ts, about 61 KB gzipped): the public
// pages use it to show who is signed in, and visitors (who aren't) never have to download the library at all.
//
// The library keeps the session in localStorage under `sb-<first part of the project's host name>-auth-token` (its default,
// checked in node_modules/@supabase/supabase-js). Only a hint: the login may have expired or been deleted, only the library
// can tell (it renews a login that is only old, and drops one that is gone).
const projectName = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/^https?:\/\//, "").split(".")[0];
export const SAVED_LOGIN_KEY = `sb-${projectName}-auth-token`;

export function hasSavedLogin(): boolean {
  try {
    return !!localStorage.getItem(SAVED_LOGIN_KEY);
  } catch {
    return false; // storage blocked (private window, site data blocked): treat as not signed in
  }
}
