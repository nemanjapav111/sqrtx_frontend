"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// TEMPORARY placeholder for the next registration step (no design yet).
// It is where the confirmation email brings the user back, and it shows whether the session works.
export default function CompanyStep() {
  // undefined = still loading, null = not signed in
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    // The library reads the token from the link the user clicked and signs them in.
    // This fires once it has finished, and again whenever the session changes.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center bg-white px-5 pt-17.5 leading-[normal] text-black">
      <h1 className="text-[20px] font-semibold">Company details</h1>
      <p className="pt-2 font-semibold text-center">
        {email === undefined && "Checking your session…"}
        {email === null && "You are not signed in on this device. If you already confirmed your email, log in to continue."}
        {email && `Email confirmed. Signed in as ${email}.`}
      </p>
      <p className="pt-2 text-[#4b5563]">The next design goes here.</p>
    </main>
  );
}
