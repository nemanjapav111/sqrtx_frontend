"use client";

import { useEffect, useState } from "react";
import BigLogo from "@/app/components/big-logo";
import PendingOverlay from "@/app/components/pending-overlay";
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

  const pending = load.status === "ready" ? undefined : load.status;
  // While it loads the two forms are shown empty, blocked (inert) and dimmed under the loading spinner box (PendingOverlay), however
  // long it takes; a failure shows the error box with "Try again" in the same place.
  // Not remembered from the last visit like the account page: a pending email change is only known to Supabase's server.
  const email = load.status === "ready" ? load.email : "";
  const pendingEmail = load.status === "ready" ? load.pendingEmail : null;

  return (
    <>
      <BigLogo />
      <h1 className="pt-9.5 pb-10 text-[20px] font-semibold md:pt-6 md:pb-6">Settings</h1>

      {/* relative: PendingOverlay (absolute) floats over this while `pending`. `inert` on the content itself keeps
          it from being read by a screen reader or focused into while it's just a placeholder underneath. */}
      <div className="relative flex w-full max-w-135 flex-col">
        <div
          inert={!!pending}
          className={`flex w-full flex-col gap-12 px-5 pb-10 transition-opacity duration-200 md:pb-6 ${pending ? "opacity-40" : ""}`}
        >
          {/* A fresh instance right as real data replaces the placeholder: ChangeEmailForm's `waitingFor` state only
              ever reads `pendingEmail` once, when it's created (see that file), so it needs to be re-created instead
              of updated once the real value is known. Harmless: the placeholder was `inert`, so nothing could have
              been typed into it yet. ChangePasswordForm doesn't seed any state from its props, so it doesn't need this. */}
          <ChangeEmailForm key={pending ? "pending" : "ready"} currentEmail={email} pendingEmail={pendingEmail} />
          <ChangePasswordForm currentEmail={email} />
        </div>

        {pending && (
          <PendingOverlay
            state={pending}
            onRetry={() => {
              setLoad({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
          />
        )}
      </div>
    </>
  );
}
