"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import BigLogo from "@/app/[lang]/components/big-logo";
import Field from "@/app/[lang]/components/field";
import { useCommonText } from "@/app/[lang]/components/lang-context";
import type { Dictionary } from "@/app/[lang]/dictionaries/en";
import { RATE_LIMIT_CODES } from "@/lib/auth-messages";
import { fill } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { emailOk } from "@/lib/validation";

// Supabase sends at most one reset email per address per minute, so the button waits that long after a send.
const RESEND_SECONDS = 60;

// Reset password, step 0 (Figma 1011:117): ask for the login email and send the reset email. What the email leads to
// (the page where the new password is set) is a later step that has no design yet.
export default function ForgotForm({ text }: { text: Dictionary["auth"]["forgot"] }) {
  const common = useCommonText();
  const [email, setEmail] = useState("");
  // The red line stays hidden until the user clicks Continue once. After that it updates as the user types.
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false); // only used to grey out the button
  const inFlight = useRef(false); // the real "already sending" guard: state would be stale for a second submit in the same instant
  const [sentTo, setSentTo] = useState<string | null>(null); // the address the email was sent to
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const emailBad = submitted && !emailOk(email);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current || cooldown > 0) return;
    const form = e.currentTarget;
    setSubmitted(true);
    setError(null);

    if (!emailOk(email)) {
      (form.elements.namedItem("email") as HTMLInputElement).focus();
      return;
    }

    inFlight.current = true;
    setSending(true);
    try {
      const address = email.trim();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(address, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(RATE_LIMIT_CODES.includes(resetError.code ?? "") ? common.rateLimitError : common.genericError);
        return;
      }
      // Supabase answers the same whether or not the address has an account, so this page does too.
      setSentTo(address);
      setCooldown(RESEND_SECONDS);
    } catch {
      setError(common.genericError);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  // noValidate: we draw our own red underline instead of the browser's pop-up messages.
  return (
    <>
      <BigLogo />
      <h1 className="pt-9.5 pb-2 text-[26px] leading-[1.2] font-bold md:pt-6">{text.title}</h1>
      <p className="pb-10 text-center text-[#636363] md:pb-6">{text.intro}</p>

      <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col items-center">
        <div className="flex w-full max-w-135 flex-col gap-5 px-5 pb-17.5">
          <Field
            label={common.loginEmail}
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={setEmail}
            invalid={emailBad}
          />
        </div>

        {/* Not "Continue" as in the design: this button sends an email, and the label should say so. Full width, like every form's button, so
            the label changing ("Resend in 42s") never changes the button's size. */}
        <div className="w-full max-w-135 px-5">
          <button
            type="submit"
            disabled={sending || cooldown > 0}
            className="w-full cursor-pointer bg-black py-3.5 text-center font-bold text-white disabled:cursor-wait disabled:opacity-60"
          >
            {cooldown > 0 ? fill(text.resendIn, { n: cooldown }) : sentTo ? text.resend : text.send}
          </button>
        </div>

        {/* Not in the design yet: the confirmation after sending, and problems from the server or the connection. */}
        <div className="min-h-5 w-full max-w-135 px-5 pt-5 text-center text-[14px]">
          {sentTo && (
            <p role="status" className="text-[#4b5563] [overflow-wrap:anywhere]">
              {fill(text.sent, { email: sentTo })}
            </p>
          )}
          {error && (
            <p role="alert" className="text-red-600">
              {error}
            </p>
          )}
        </div>
      </form>

      <Link href="/login" className="pt-2 pb-2 text-[14px] font-semibold text-[#4b5563] underline">
        {text.back}
      </Link>
    </>
  );
}
