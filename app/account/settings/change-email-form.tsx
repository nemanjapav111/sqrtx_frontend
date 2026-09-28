"use client";

import { useRef, useState } from "react";
import Field from "@/app/components/field";
import { checkPassword } from "@/lib/account";
import { GENERIC_ERROR, RATE_LIMIT_CODES, RATE_LIMIT_ERROR } from "@/lib/auth-messages";
import { supabase } from "@/lib/supabase";
import { emailOk } from "@/lib/validation";

// Not in the design: what the user sees when something is refused.
const WRONG_PASSWORD = "Wrong password.";
const SAME_EMAIL = "That is already your login email.";
const EMAIL_TAKEN = "That email address is already used by another account.";

// "Change login email" (Figma 1005:97: Password* and New Login Email*, button CONTINUE). The label is "Change email"
// here instead of the design's "CONTINUE": it says what the button does (the same reasoning as on the forgot password
// page). The change is not instant: Supabase emails a confirmation link, and the login email only changes once the
// links are opened. The API's copy of the email (users.login_email) follows by itself (a database trigger).
export default function ChangeEmailForm({ currentEmail, pendingEmail }: { currentEmail: string; pendingEmail: string | null }) {
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  // Red lines stay hidden until the user clicks the button once. After that they update as the user types.
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false); // only used to grey out the button
  const inFlight = useRef(false); // the real "already sending" guard: state would be stale for a second submit in the same instant
  const [error, setError] = useState<string | null>(null);
  const [waitingFor, setWaitingFor] = useState<string | null>(pendingEmail); // a change that is waiting for its links to be opened

  const sameEmail = newEmail.trim().toLowerCase() === currentEmail.toLowerCase();
  const emailBad = submitted && (!emailOk(newEmail) || sameEmail);
  const passwordBad = submitted && password === "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    const form = e.currentTarget;
    setSubmitted(true);
    setError(null);

    // Send the cursor to the first field that needs fixing.
    const field = password === "" ? "password" : !emailOk(newEmail) || sameEmail ? "newEmail" : null;
    if (field) {
      if (field === "newEmail" && sameEmail) setError(SAME_EMAIL);
      (form.elements.namedItem(field) as HTMLInputElement).focus();
      return;
    }

    inFlight.current = true;
    setSending(true);
    try {
      const checked = await checkPassword(currentEmail, password);
      if (checked !== "ok") {
        setError(checked === "wrong" ? WRONG_PASSWORD : checked === "limited" ? RATE_LIMIT_ERROR : GENERIC_ERROR);
        return;
      }
      const target = newEmail.trim();
      const { error: updateError } = await supabase.auth.updateUser(
        { email: target },
        { emailRedirectTo: `${window.location.origin}/account/settings` },
      );
      if (updateError) {
        if (updateError.code === "email_exists") setError(EMAIL_TAKEN);
        else setError(RATE_LIMIT_CODES.includes(updateError.code ?? "") ? RATE_LIMIT_ERROR : GENERIC_ERROR);
        return;
      }
      setWaitingFor(target);
      setPassword("");
      setNewEmail("");
      setSubmitted(false);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  // noValidate: we draw our own red underline instead of the browser's pop-up messages.
  // method="post" so a password can never end up in the URL if this runs before the page is ready.
  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-[16px] font-semibold">Change login email</h2>
      <p className="text-[14px]">
        <span className="text-[#4b5563]">Your login email: </span>
        {currentEmail}
      </p>

      {/* Not in the design yet: a change is waiting for its confirmation links. */}
      {waitingFor && (
        <p role="status" className="text-[14px] font-semibold">
          We sent confirmation links to {currentEmail} and {waitingFor}. Open both to finish the change. Until then, keep logging
          in with {currentEmail}.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate method="post" className="flex w-full flex-col gap-5">
        <Field
          label="Password*"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          invalid={passwordBad}
        />
        <Field
          label="New login email*"
          name="newEmail"
          type="email"
          autoComplete="off"
          value={newEmail}
          onChange={setNewEmail}
          invalid={emailBad}
        />

        <button
          type="submit"
          disabled={sending}
          className="mt-4 cursor-pointer self-center bg-black px-12 py-2.75 font-bold text-white disabled:cursor-wait disabled:opacity-60"
        >
          Change email
        </button>

        {/* Wrong password, address already used, rate limit, or no connection. Not in the design yet. */}
        {error && (
          <p role="alert" className="text-center text-[14px] text-red-600">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
