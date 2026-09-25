"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Field from "./field";

// name@domain.tld: no spaces, no empty parts, and the ending (tld) is at least 2 characters.
// (Checking that the address really exists is done by the confirmation email.)
const emailOk = (v: string) => /^[^\s@]+@([^\s@.]+\.)+[^\s@.]{2,}$/.test(v.trim());

// Must match the Supabase password policy (Auth settings): at least 8 characters and one each of
// a-z, A-Z and 0-9. Supabase only counts those plain letters, so other alphabets (Ć, Ж) don't count.
const passwordOk = (v: string) => v.length >= 8 && /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v);

// Supabase error codes we can explain to the user. Anything else gets the generic message.
const ERROR_MESSAGES: Record<string, string> = {
  weak_password: "That password is too weak. Use at least 8 characters, upper and lowercase letters, and a number.",
  email_address_invalid: "Please enter a valid email address.",
  over_email_send_rate_limit: "Too many attempts. Please wait a few minutes and try again.",
  over_request_rate_limit: "Too many attempts. Please wait a few minutes and try again.",
};
const GENERIC_ERROR = "Something went wrong. Please check your connection and try again.";

// Where the link in the confirmation email brings the user back to.
const NEXT_STEP = "/register/company";

export default function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Errors stay hidden until the user clicks Next once. After that they update as the user types.
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false); // only used to grey out the button
  const inFlight = useRef(false); // the real "already sending" guard: state would be stale for a second submit in the same instant
  const [sent, setSent] = useState(false); // account created, waiting for the user to confirm their email
  const [error, setError] = useState<string | null>(null);

  const emailBad = submitted && !emailOk(email);
  const passwordBad = submitted && !passwordOk(password);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    setSubmitted(true);
    setError(null);

    // Send the cursor to the first field that needs fixing.
    const field = !emailOk(email) ? "email" : !passwordOk(password) ? "password" : null;
    if (field) {
      (e.currentTarget.elements.namedItem(field) as HTMLInputElement).focus();
      return;
    }

    inFlight.current = true;
    setSending(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}${NEXT_STEP}` },
      });

      if (error) {
        setError(ERROR_MESSAGES[error.code ?? ""] ?? GENERIC_ERROR);
      } else if (data.session) {
        router.push(NEXT_STEP); // email confirmation is off in Supabase: already signed in
      } else {
        // Email confirmation is on. We show the same message even if the address is already
        // registered, so nobody can use this form to find out who has an account.
        setSent(true);
      }
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="flex w-full max-w-135 flex-col items-center gap-2 px-5 pb-17.5 text-center">
        <p className="text-[20px] font-semibold">Check your email</p>
        <p>
          We sent a confirmation link to <span className="font-semibold break-all">{email.trim()}</span>. Open it to
          continue.
        </p>
      </div>
    );
  }

  // noValidate: we draw our own red underline instead of the browser's pop-up messages.
  // method="post" so the password can never end up in the URL if this runs before the page is ready.
  return (
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
        />
        <Field
          label="Password*"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="Minimum 8 characters, upper and lowercase letters, and a number."
          value={password}
          onChange={setPassword}
          invalid={passwordBad}
        />
      </div>

      {/* The arrow is an SVG because the → character isn't in the Inter font files Google serves. */}
      <button
        type="submit"
        disabled={sending}
        className="flex cursor-pointer items-center gap-1 bg-black px-17.25 py-2.75 font-bold text-white disabled:cursor-wait disabled:opacity-60"
      >
        Next
        <svg aria-hidden viewBox="0 0 11 12" className="h-3.5 w-3 translate-y-px" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M0 6h9.6M5.1 1.5L9.6 6l-4.5 4.5" />
        </svg>
      </button>

      {/* Server errors (rate limit, weak password, no connection). Not in the design yet. */}
      {error && (
        <p role="alert" className="w-full max-w-135 px-5 pt-5 text-center text-[14px] text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
