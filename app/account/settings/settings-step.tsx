"use client";

import { useEffect, useState } from "react";
import BigLogo from "@/app/components/big-logo";
import Loading from "@/app/components/loading";
import { GENERIC_ERROR } from "@/lib/auth-messages";
import { supabase } from "@/lib/supabase";
import { useRequireSession } from "@/lib/use-session";
import ChangeEmailForm from "./change-email-form";
import ChangePasswordForm from "./change-password-form";

type Load = { status: "loading" } | { status: "error" } | { status: "ready"; email: string; pendingEmail: string | null };

// Loads who is logged in, then shows the two forms. It asks Supabase's server (getUser) instead of reading the copy in
// the browser, because an email change that was confirmed in the meantime is only known there.
export default function SettingsStep() {
  const session = useRequireSession();
  const [attempt, setAttempt] = useState(0); // "Try again" runs the loading again
  const [load, setLoad] = useState<Load>({ status: "loading" });

  useEffect(() => {
    if (session !== "signed-in") return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user?.email) throw error ?? new Error("no user");
        if (!cancelled) setLoad({ status: "ready", email: data.user.email, pendingEmail: data.user.new_email ?? null });
      } catch {
        if (!cancelled) setLoad({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, attempt]);

  return (
    <>
      <BigLogo />
      <h1 className="pt-9.5 pb-10 text-[20px] font-semibold md:pt-6 md:pb-6">Settings</h1>

      {load.status === "loading" && <Loading />}

      {load.status === "error" && (
        <div className="flex flex-col items-center gap-4 px-5 text-center">
          <p role="alert" className="text-red-600">
            {GENERIC_ERROR}
          </p>
          <button
            type="button"
            onClick={() => {
              setLoad({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
            className="h-11 w-46.5 cursor-pointer border-2 border-black bg-white font-bold"
          >
            Try again
          </button>
        </div>
      )}

      {load.status === "ready" && (
        <div className="flex w-full max-w-135 flex-col gap-12 px-5 pb-10 md:pb-6">
          <ChangeEmailForm currentEmail={load.email} pendingEmail={load.pendingEmail} />
          <ChangePasswordForm currentEmail={load.email} />
        </div>
      )}
    </>
  );
}
