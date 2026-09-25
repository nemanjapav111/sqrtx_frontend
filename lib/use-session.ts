"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// For pages that need a signed-in user. Sends everyone else to the login page.
// It waits for Supabase to finish starting up first: when the user arrives from the confirmation email,
// the library needs a moment to turn the link into a session, and checking too early would wrongly send
// them to the login page.
export function useRequireSession(): "loading" | "signed-in" {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "signed-in">("loading");

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) setStatus("signed-in");
      else if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") router.replace("/login");
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  return status;
}
