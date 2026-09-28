"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BigLogo from "@/app/components/big-logo";
import Field from "@/app/components/field";
import { GENERIC_ERROR, RATE_LIMIT_CODES, RATE_LIMIT_ERROR } from "@/lib/auth-messages";
import { getOnboardingState, pathForStep } from "@/lib/onboarding";
import { supabase } from "@/lib/supabase";
import { passwordOk } from "@/lib/validation";

// Not in the design: what the user sees when the numbers don't match, the link is bad, or Supabase refuses.
const MISMATCH = "The passwords don't match.";
const INVALID_LINK = "This link is invalid or has expired.";
const PASSWORD_ERRORS: Record<string, string> = {
  weak_password: "That password is too weak. Use at least 8 characters, upper and lowercase letters, and a number.",
  same_password: "The new password must be different from your old one.",
};

// Reset password, step 1 (Figma 1005:74, the page the reset email leads to): set the new password. Supabase turns the
// link in the email into a temporary session when the page loads, and that session is what allows the change.
export default function ResetForm() {
  const router = useRouter();
  const [link, setLink] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  // Red lines stay hidden until the user clicks Save once. After that they update as the user types.
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false); // only used to grey out the button
  const inFlight = useRef(false); // the real "already saving" guard: state would be stale for a second submit in the same instant
  const [error, setError] = useState<string | null>(null);

  // Waits for Supabase to finish starting up (it needs a moment to read the link), like useRequireSession does.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) setLink("ok");
      else if (event === "INITIAL_SESSION") setLink("invalid");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const [saved, setSaved] = useState(false);
  const [continuing, setContinuing] = useState(false); // only used to grey out the Continue button

  // The reset link already signed them in, so Continue takes them where a normal log in would.
  async function continueOn() {
    setContinuing(true);
    try {
      const state = await getOnboardingState();
      router.push(pathForStep(state.step));
    } catch {
      router.push("/login");
    }
  }

  const passwordBad = submitted && !passwordOk(password);
  const repeatBad = submitted && repeat !== password;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    const form = e.currentTarget;
    setSubmitted(true);
    setError(null);

    // Send the cursor to the first field that needs fixing.
    const field = !passwordOk(password) ? "password" : repeat !== password ? "repeat" : null;
    if (field) {
      (form.elements.namedItem(field) as HTMLInputElement).focus();
      return;
    }

    inFlight.current = true;
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        const known = PASSWORD_ERRORS[updateError.code ?? ""];
        setError(known ?? (RATE_LIMIT_CODES.includes(updateError.code ?? "") ? RATE_LIMIT_ERROR : GENERIC_ERROR));
        return;
      }
      setSaved(true); // the confirmation with its Continue button replaces the form
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  // noValidate: we draw our own red underline instead of the browser's pop-up messages.
  // method="post" so a password can never end up in the URL if this runs before the page is ready.
  return (
    <>
      <BigLogo />
      <h1 className="pt-9.5 pb-12 text-[20px] font-semibold">Reset password</h1>

      {link === "invalid" && (
        <div role="alert" className="flex w-full max-w-135 flex-col items-center gap-3 px-5 text-center">
          <p className="font-semibold">{INVALID_LINK}</p>
          <Link href="/forgot-password" className="text-[14px] font-semibold underline">
            Request a new link
          </Link>
        </div>
      )}

      {/* Not in the design yet: the confirmation after saving. */}
      {link === "ok" && saved && (
        <div className="flex w-full max-w-135 flex-col items-center gap-8 px-5 text-center">
          <p role="status" className="font-semibold">
            Your password was changed.
          </p>
          <button
            type="button"
            onClick={continueOn}
            disabled={continuing}
            className="cursor-pointer bg-black px-17.25 py-2.75 font-bold text-white disabled:cursor-wait disabled:opacity-60"
          >
            Continue
          </button>
        </div>
      )}

      {link === "ok" && !saved && (
        <form onSubmit={handleSubmit} noValidate method="post" className="flex w-full flex-col items-center">
          <div className="flex w-full max-w-135 flex-col gap-5 px-5 pb-17.5">
            <Field
              label="New password*"
              name="password"
              type="password"
              autoComplete="new-password"
              hint="Minimum 8 characters, upper and lowercase letters, and a number."
              value={password}
              onChange={setPassword}
              invalid={passwordBad}
            />
            <Field
              label="Repeat password*"
              name="repeat"
              type="password"
              autoComplete="new-password"
              message={repeatBad && repeat !== "" ? <p className="text-[13px] font-medium text-red-600">{MISMATCH}</p> : null}
              value={repeat}
              onChange={setRepeat}
              invalid={repeatBad}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer bg-black px-17.25 py-2.75 font-bold text-white disabled:cursor-wait disabled:opacity-60"
          >
            Save
          </button>

          {/* Refused password, rate limit, or no connection. Not in the design yet. */}
          {error && (
            <p role="alert" className="w-full max-w-135 px-5 pt-5 text-center text-[14px] text-red-600">
              {error}
            </p>
          )}
        </form>
      )}
    </>
  );
}
