"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BigLogo from "@/app/components/big-logo";
import { GENERIC_ERROR, RATE_LIMIT_CODES, RATE_LIMIT_ERROR } from "@/lib/auth-messages";
import { supabase } from "@/lib/supabase";
import ArrowIcon from "./arrow-icon";
import { NEXT_STEP } from "./constants";

// Supabase allows one confirmation email per user per minute. The first email was sent a moment ago.
const RESEND_SECONDS = 60;

// One message for both "not confirmed yet" and "wrong password".
const CONTINUE_ERROR = "We can't see your confirmation yet. Open the link in your email, then try again.";

export default function VerifyEmail({
  email,
  password,
  onChangeEmail,
}: {
  email: string;
  password: string; // kept in memory only, so "Continue" can sign in on this device
  onChangeEmail: () => void;
}) {
  const router = useRouter();
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [busy, setBusy] = useState(false); // greys out the buttons
  const inFlight = useRef(false); // the real guard against a double click (state would be stale)
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-continue: the user opened the link in another tab of this browser, which signs them in
  // and tells this tab. Only counts if the session belongs to the address we are waiting for.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.email?.toLowerCase() === email.toLowerCase()) router.push(NEXT_STEP);
    });
    return () => data.subscription.unsubscribe();
  }, [email, router]);

  // Countdown for the Resend button.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Runs one action at a time and handles the shared busy/notice/error state.
  async function run(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await action();
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const resend = () =>
    run(async () => {
      if (cooldown > 0) return;
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}${NEXT_STEP}` },
      });
      if (error) {
        setError(RATE_LIMIT_CODES.includes(error.code ?? "") ? RATE_LIMIT_ERROR : GENERIC_ERROR);
      } else {
        setNotice("We sent the email again.");
      }
      setCooldown(RESEND_SECONDS); // wait before another try, whether it worked or not
    });

  // For someone who opened the link on another device: sign in here with the password they just typed.
  const continueHere = () =>
    run(async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        router.push(NEXT_STEP);
      } else if (error.code === "email_not_confirmed" || error.code === "invalid_credentials") {
        setError(CONTINUE_ERROR);
      } else {
        setError(RATE_LIMIT_CODES.includes(error.code ?? "") ? RATE_LIMIT_ERROR : GENERIC_ERROR);
      }
    });

  return (
    <>
      <BigLogo />

      <div role="status" className="flex w-full max-w-135 flex-col items-center gap-3 px-5 pt-9.5 text-center">
        {/* overflow-wrap:anywhere: a very long address wraps at the screen edge instead of running off it */}
        <p className="font-semibold [overflow-wrap:anywhere]">
          We sent a confirmation link to <span className="font-bold">{email}</span> — please verify it to continue your
          registration.
        </p>
        <p className="text-[13px] font-medium text-[#4b5563]">Can&apos;t find it? Check your spam folder.</p>
      </div>

      <div className="flex flex-col items-center gap-4 pt-8">
        <button
          type="button"
          onClick={resend}
          disabled={busy || cooldown > 0}
          className="w-46.5 cursor-pointer border-2 border-black py-2.25 font-bold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend email"}
        </button>
        <button type="button" onClick={onChangeEmail} className="cursor-pointer text-[14px] font-semibold underline">
          Change email
        </button>
      </div>

      {/* Feedback for Resend / Continue. Not in the design yet. */}
      <div className="min-h-5 w-full max-w-135 px-5 pt-4 text-center text-[14px]">
        {notice && (
          <p role="status" className="text-[#4b5563]">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
      </div>

      <p className="flex items-center gap-1.5 pt-6 text-[14px] font-semibold">
        Confirmed on another device?
        <button
          type="button"
          onClick={continueHere}
          disabled={busy}
          className="flex cursor-pointer items-center gap-1 font-bold disabled:cursor-wait disabled:opacity-60"
        >
          Continue
          <ArrowIcon className="h-3.5 w-3 translate-y-px" />
        </button>
      </p>
    </>
  );
}
