"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Field from "@/app/components/field";
import { GENERIC_ERROR, RATE_LIMIT_ERROR } from "@/lib/auth-messages";
import { supabase } from "@/lib/supabase";
import { emailOk, passwordOk } from "@/lib/validation";
import ArrowIcon from "./arrow-icon";
import { NEXT_STEP } from "./constants";

// Supabase error codes we can explain to the user. Anything else gets the generic message.
const ERROR_MESSAGES: Record<string, string> = {
  weak_password: "That password is too weak. Use at least 8 characters, upper and lowercase letters, and a number.",
  email_address_invalid: "Please enter a valid email address.",
  over_email_send_rate_limit: RATE_LIMIT_ERROR,
  over_request_rate_limit: RATE_LIMIT_ERROR,
};

const ALREADY_REGISTERED = "Already registered";

export default function RegisterForm({
  initialEmail,
  onSent,
}: {
  initialEmail: string; // used when the user comes back with "Change email"
  onSent: (email: string, password: string) => void; // account created, confirmation email sent
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  // Errors stay hidden until the user clicks Next once. After that they update as the user types.
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false); // only used to grey out the button
  const inFlight = useRef(false); // the real "already sending" guard: state would be stale for a second submit in the same instant
  const [error, setError] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false); // this address already has an account

  const emailBad = submitted && !emailOk(email);
  const passwordBad = submitted && !passwordOk(password);
  const message = emailTaken ? ALREADY_REGISTERED : error; // the red line under the button

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    const form = e.currentTarget; // kept now because the event is gone after the await below
    setSubmitted(true);
    setError(null);
    setEmailTaken(false);

    // Send the cursor to the first field that needs fixing.
    const field = !emailOk(email) ? "email" : !passwordOk(password) ? "password" : null;
    if (field) {
      (form.elements.namedItem(field) as HTMLInputElement).focus();
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

      // With email confirmation on, Supabase doesn't return an error for an address that already has a
      // confirmed account. It answers "success" with an empty identities list instead. (A community-known
      // behaviour, not a documented promise, so re-check it after Supabase upgrades.)
      const alreadyRegistered =
        error?.code === "user_already_exists" || error?.code === "email_exists" || data.user?.identities?.length === 0;

      if (alreadyRegistered) {
        setEmailTaken(true);
        (form.elements.namedItem("email") as HTMLInputElement).focus();
      } else if (error) {
        setError(ERROR_MESSAGES[error.code ?? ""] ?? GENERIC_ERROR);
      } else if (data.session) {
        router.push(NEXT_STEP); // email confirmation is off in Supabase: already signed in
      } else {
        onSent(email.trim(), password); // new account, confirmation email sent
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
    <form onSubmit={handleSubmit} noValidate method="post" className="flex w-full flex-col items-center">
      <div className="flex w-full max-w-135 flex-col gap-5 px-5 pb-17.5">
        <Field
          label="Login email*"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(v) => {
            setEmail(v);
            setEmailTaken(false); // a different address may be free
          }}
          invalid={emailBad || emailTaken}
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

      <button
        type="submit"
        disabled={sending}
        className="flex cursor-pointer items-center gap-1 bg-black px-17.25 py-2.75 font-bold text-white disabled:cursor-wait disabled:opacity-60"
      >
        Next
        <ArrowIcon className="h-3.5 w-3 translate-y-px" />
      </button>

      {/* "Already registered" and server errors (rate limit, weak password, no connection). Not in the design yet. */}
      {message && (
        <p role="alert" className="w-full max-w-135 px-5 pt-5 text-center text-[14px] text-red-600">
          {message}
        </p>
      )}
    </form>
  );
}
