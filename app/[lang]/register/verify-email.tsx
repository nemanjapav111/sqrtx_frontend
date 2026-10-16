"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BigLogo from "@/app/[lang]/components/big-logo";
import { useCommonText } from "@/app/[lang]/components/lang-context";
import type { Dictionary } from "@/app/[lang]/dictionaries/en";
import { RATE_LIMIT_CODES } from "@/lib/auth-messages";
import { fill } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import ArrowIcon from "./arrow-icon";
import { NEXT_STEP } from "./constants";
import StepProgress from "./step-progress";

// Supabase allows one confirmation email per user per minute. The first email was sent a moment ago.
const RESEND_SECONDS = 60;

// text.continueError is one message for both "not confirmed yet" and "wrong password".

// The web inbox of the big mail providers, from the address's domain. null for any other address (a company's own mail): no button then.
const INBOXES: Record<string, { name: string; url: string }> = {
  "gmail.com": { name: "Gmail", url: "https://mail.google.com" },
  "googlemail.com": { name: "Gmail", url: "https://mail.google.com" },
  "outlook.com": { name: "Outlook", url: "https://outlook.live.com/mail" },
  "hotmail.com": { name: "Outlook", url: "https://outlook.live.com/mail" },
  "live.com": { name: "Outlook", url: "https://outlook.live.com/mail" },
  "yahoo.com": { name: "Yahoo Mail", url: "https://mail.yahoo.com" },
  "icloud.com": { name: "iCloud Mail", url: "https://www.icloud.com/mail" },
};
const inboxFor = (email: string) => INBOXES[email.split("@")[1]?.trim().toLowerCase() ?? ""] ?? null;

export default function VerifyEmail({
  text,
  email,
  password,
  onChangeEmail,
}: {
  text: Dictionary["auth"]["verify"];
  email: string;
  password: string; // kept in memory only, so "Continue" can sign in on this device
  onChangeEmail: () => void;
}) {
  const router = useRouter();
  const common = useCommonText();
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [busy, setBusy] = useState(false); // greys out the buttons
  const inFlight = useRef(false); // the real guard against a double click (state would be stale)
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false); // the link was opened in another tab of this browser: that tab carries on, this one only says so

  // The user opened the link in another tab of this browser, which signs them in and tells this tab. That tab (the link's page) is the one that carries on
  // to the next step; this one does not move on by itself, so there are not two pages on the same step: it says the email is confirmed (with a button to
  // carry on here instead, for someone who closed the other tab). Only counts if the session belongs to the address we are waiting for.
  // INITIAL_SESSION is ignored: Supabase sends it to every new listener right away with whatever session the browser
  // already had, and that is an OLD session, not the link being opened. Found when a user was deleted in Supabase and
  // registered again with the same address in the same browser: the deleted user's leftover session (same email) sent
  // them straight past the "check your email" page. Only a session that appears while we wait (SIGNED_IN) counts.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      if (session?.user.email?.toLowerCase() === email.toLowerCase()) setConfirmed(true);
    });
    return () => data.subscription.unsubscribe();
  }, [email]);

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
      setError(common.genericError);
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
        setError(RATE_LIMIT_CODES.includes(error.code ?? "") ? common.rateLimitError : common.genericError);
      } else {
        setNotice(text.resent);
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
        setError(text.continueError);
      } else {
        setError(RATE_LIMIT_CODES.includes(error.code ?? "") ? common.rateLimitError : common.genericError);
      }
    });

  const inbox = inboxFor(email);

  if (confirmed) {
    return (
      <>
        <BigLogo />
        <StepProgress current={1} />
        <div role="status" className="flex w-full max-w-135 flex-col items-center px-5 pt-7 text-center">
          <svg aria-hidden viewBox="0 0 52 52" className="size-13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
            <circle cx="26" cy="26" r="24" />
            <path d="M15 27l8 8 14-17" strokeLinecap="round" />
          </svg>
          <h1 className="pt-5 pb-3 text-[26px] leading-[1.2] font-bold">{text.confirmedTitle}</h1>
          <p className="text-[#636363]">{text.confirmedText}</p>
        </div>
        <div className="w-full max-w-135 px-5 pt-8">
          <button
            type="button"
            onClick={() => router.push(NEXT_STEP)}
            className="flex w-full cursor-pointer items-center justify-center gap-1 bg-black py-3.5 font-bold text-white"
          >
            {text.continueHere}
            <ArrowIcon className="h-3.5 w-3 translate-y-px" />
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <BigLogo />
      <StepProgress current={1} />

      <div role="status" className="flex w-full max-w-135 flex-col items-center px-5 pt-7 text-center">
        <svg aria-hidden viewBox="0 0 52 38" className="h-9.5 w-13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
          <rect x="1.5" y="1.5" width="49" height="35" />
          <path d="M1.5 1.5L26 22l24.5-20.5" />
        </svg>
        <h1 className="pt-5 pb-3 text-[26px] leading-[1.2] font-bold">{text.title}</h1>
        {/* overflow-wrap:anywhere: a very long address wraps at the screen edge instead of running off it */}
        <p className="text-[#636363]">{text.sentTo}</p>
        <p className="font-semibold [overflow-wrap:anywhere]">{email}</p>
        <p className="text-[#636363]">{text.openIt}</p>
      </div>

      {/* The inbox of the big providers, in a new tab (this page keeps waiting for the link). Other addresses: no button. */}
      {inbox && (
        <div className="w-full max-w-135 px-5 pt-8">
          <a
            href={inbox.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-1.5 bg-black py-3.5 font-bold text-white"
          >
            {fill(text.openInbox, { name: inbox.name })}
            <span aria-hidden>↗</span>
          </a>
        </div>
      )}

      <p className="pt-6 text-[14px] text-[#636363]">{text.spam}</p>
      <p className="flex items-center gap-2.5 pt-3 text-[14px] text-[#636363]">
        {text.didntGet}
        <button
          type="button"
          onClick={resend}
          disabled={busy || cooldown > 0}
          className="cursor-pointer font-semibold text-black disabled:cursor-not-allowed disabled:font-normal disabled:text-[#9ca3af]"
        >
          {cooldown > 0 ? fill(text.resendIn, { n: cooldown }) : text.resend}
        </button>
        <span aria-hidden className="text-[#9ca3af]">·</span>
        <button type="button" onClick={onChangeEmail} className="cursor-pointer font-semibold text-black underline underline-offset-2">
          {text.changeEmail}
        </button>
      </p>

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

      <div className="mt-6 flex w-full max-w-135 justify-center border-t border-[#e5e7eb] px-5 pt-5">
        <p className="flex items-center gap-1.5 text-[14px] font-semibold">
          {text.alreadyConfirmed}
          <button
            type="button"
            onClick={continueHere}
            disabled={busy}
            className="flex cursor-pointer items-center gap-1 font-bold disabled:cursor-wait disabled:opacity-60"
          >
            {text.continue}
            <ArrowIcon className="h-3.5 w-3 translate-y-px" />
          </button>
        </p>
      </div>
    </>
  );
}
