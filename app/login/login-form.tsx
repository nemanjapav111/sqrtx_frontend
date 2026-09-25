"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import BigLogo from "@/app/components/big-logo";
import Field from "@/app/components/field";
import { GENERIC_ERROR, RATE_LIMIT_CODES, RATE_LIMIT_ERROR } from "@/lib/auth-messages";
import { getOnboardingState, pathForStep } from "@/lib/onboarding";
import { supabase } from "@/lib/supabase";
import { emailOk } from "@/lib/validation";

// "Not confirmed yet" only comes back when the password was right, so showing it doesn't reveal who has an account.
const WRONG_LOGIN = "Wrong email or password.";
const NOT_CONFIRMED = "Please confirm your email first. Open the link we sent you.";
const PROGRESS_ERROR = "You're logged in, but we couldn't load your registration progress. Please try again.";

// "Forgot ..." links from the design. Their pages don't exist yet.
const helperLink = (text: string) => (
  <Link href="#" className="self-end text-[13px] font-medium">
    {text}
  </Link>
);

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Red lines stay hidden until the user clicks Log in once. After that they update as the user types.
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false); // only used to grey out the button
  const inFlight = useRef(false); // the real "already sending" guard: state would be stale for a second submit in the same instant
  const [error, setError] = useState<string | null>(null);

  // Log in accepts any password the account already has, so only "not empty" is checked.
  const emailBad = submitted && !emailOk(email);
  const passwordBad = submitted && password === "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    const form = e.currentTarget;
    setSubmitted(true);
    setError(null);

    // Send the cursor to the first field that needs fixing.
    const field = !emailOk(email) ? "email" : password === "" ? "password" : null;
    if (field) {
      (form.elements.namedItem(field) as HTMLInputElement).focus();
      return;
    }

    inFlight.current = true;
    setSending(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        if (signInError.code === "invalid_credentials") setError(WRONG_LOGIN);
        else if (signInError.code === "email_not_confirmed") setError(NOT_CONFIRMED);
        else setError(RATE_LIMIT_CODES.includes(signInError.code ?? "") ? RATE_LIMIT_ERROR : GENERIC_ERROR);
        return;
      }

      // Signed in. Ask the server how far this user got in registration and send them to that page.
      try {
        const state = await getOnboardingState();
        router.push(pathForStep(state.step));
      } catch {
        setError(PROGRESS_ERROR);
      }
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  // noValidate: we draw our own red underline instead of the browser's pop-up messages.
  // method="post" so the password can never end up in the URL if this runs before the page is ready.
  return (
    <>
      <BigLogo />
      <h1 className="pt-9.5 pb-12 text-[20px] font-semibold">Log in</h1>

      <form onSubmit={handleSubmit} noValidate method="post" className="flex w-full flex-col items-center">
        <div className="flex w-full max-w-135 flex-col gap-5 px-5 pb-17.5">
          <Field
            label="Login email*"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={setEmail}
            invalid={emailBad}
            below={helperLink("Forgot email?")}
          />
          <Field
            label="Password*"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            invalid={passwordBad}
            below={helperLink("Forgot password?")}
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="cursor-pointer bg-black px-17.25 py-2.75 font-bold text-white disabled:cursor-wait disabled:opacity-60"
        >
          Log in
        </button>

        {/* Wrong login, not confirmed yet, rate limit, or no connection. Not in the design yet. */}
        {error && (
          <p role="alert" className="w-full max-w-135 px-5 pt-5 text-center text-[14px] text-red-600">
            {error}
          </p>
        )}
      </form>
    </>
  );
}
