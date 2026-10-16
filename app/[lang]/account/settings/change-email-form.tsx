"use client";

import { useRef, useState } from "react";
import Field from "@/app/[lang]/components/field";
import { useCommonText } from "@/app/[lang]/components/lang-context";
import type { Dictionary } from "@/app/[lang]/dictionaries/en";
import { checkPassword } from "@/lib/account";
import { RATE_LIMIT_CODES } from "@/lib/auth-messages";
import { fill } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { emailOk } from "@/lib/validation";

// "Change login email" (Figma 1005:97: Password* and New Login Email*, button CONTINUE). The label is "Change email"
// here instead of the design's "CONTINUE": it says what the button does (the same reasoning as on the forgot password
// page). The change is not instant: Supabase emails a confirmation link, and the login email only changes once the
// links are opened. The API's copy of the email (users.login_email) follows by itself (a database trigger).
export default function ChangeEmailForm({
  text,
  currentEmail,
  pendingEmail,
}: {
  text: Dictionary["account"]["settings"];
  currentEmail: string;
  pendingEmail: string | null;
}) {
  const common = useCommonText();
  const t = text.email;
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
      if (field === "newEmail" && sameEmail) setError(t.same);
      (form.elements.namedItem(field) as HTMLInputElement).focus();
      return;
    }

    inFlight.current = true;
    setSending(true);
    try {
      const checked = await checkPassword(currentEmail, password);
      if (checked !== "ok") {
        setError(checked === "wrong" ? text.wrongPassword : checked === "limited" ? common.rateLimitError : common.genericError);
        return;
      }
      const target = newEmail.trim();
      const { error: updateError } = await supabase.auth.updateUser(
        { email: target },
        { emailRedirectTo: `${window.location.origin}/account/settings` },
      );
      if (updateError) {
        if (updateError.code === "email_exists") setError(t.taken);
        else setError(RATE_LIMIT_CODES.includes(updateError.code ?? "") ? common.rateLimitError : common.genericError);
        return;
      }
      setWaitingFor(target);
      setPassword("");
      setNewEmail("");
      setSubmitted(false);
    } catch {
      setError(common.genericError);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  // noValidate: we draw our own red underline instead of the browser's pop-up messages.
  // method="post" so a password can never end up in the URL if this runs before the page is ready.
  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-[16px] font-semibold">{t.title}</h2>
      <p className="text-[14px]">
        <span className="text-[#4b5563]">{t.yours}</span>
        {currentEmail}
      </p>

      {/* Not in the design yet: a change is waiting for its confirmation links. */}
      {waitingFor && (
        <p role="status" className="text-[14px] font-semibold">
          {fill(t.sent, { current: currentEmail, new: waitingFor })}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate method="post" className="flex w-full flex-col gap-5">
        <Field
          label={text.currentPassword}
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          invalid={passwordBad}
        />
        <Field
          label={t.newEmail}
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
          className="mt-4 w-full cursor-pointer bg-black py-3.5 font-bold text-white disabled:cursor-wait disabled:opacity-60"
        >
          {t.button}
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
