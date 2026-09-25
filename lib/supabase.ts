import { createClient } from "@supabase/supabase-js";

// NEXT_PUBLIC_ values must be written out in full like this so Next.js can put them into the browser bundle.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.local).");
}

// One shared client for the whole site. In the browser it keeps the session (access token +
// refresh token) in local storage and refreshes the access token before it expires.
// Only import this from client components ("use client").
export const supabase = createClient(url, key);
