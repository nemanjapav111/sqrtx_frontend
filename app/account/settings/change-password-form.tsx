"use client";

import { useRef, useState } from "react";
import Field from "@/app/components/field";
import { checkPassword } from "@/lib/account";
import { GENERIC_ERROR, RATE_LIMIT_CODES, RATE_LIMIT_ERROR } from "@/lib/auth-messages";
import { supabase } from "@/lib/supabase";
import { passwordOk } from "@/lib/validation";

// Not in the design: what the user sees when the numbers don't match or Supabase refuses.
const WRONG_PASSWORD = "Wrong password.";
const MISMATCH = "The passwords don't match.";
const PASSWORD_ERRORS: Record<string, string> = {
  weak_password: "That password is too weak. Use at least 8 characters, upper and lowercase letters, and a number.",
  same_password: "The new password must be different from your old one.",
};

// "Change password" for someone who is logged in and knows their password (someone who forgot it uses "Forgot password?"
// on the log in page). No design for it: it is built from the change email form and the reset password page (the same
// hint, the same rules), and all its wording is placeholder. It asks for the current password first.
export default function ChangePasswordForm({ currentEmail }: { currentEmail: string }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  // Red lines stay hidden until the user clicks the button once. After that they update as the user types.
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false); // only used to grey out the button
  const inFlight = useRef(false); // the real "already saving" guard: state would be stale for a second submit in the same instant
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<"no" | "yes" | "others-too">("no"); // "others-too": the other devices were logged out as well

  const currentBad = submitted && current === "";
  const passwordBad = submitted && !passwordOk(password);
  const repeatBad = submitted && repeat !== password;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    const form = e.currentTarget;
    setSubmitted(true);
    setError(null);
    setSaved("no");

    // Send the cursor to the first field that needs fixing.
    const field = current === "" ? "current" : !passwordOk(password) ? "password" : repeat !== password ? "repeat" : null;
    if (field) {
      (form.elements.namedItem(field) as HTMLInputElement).focus();
      return;
    }

    inFlight.current = true;
    setSaving(true);
    try {
      const checked = await checkPassword(currentEmail, current);
      if (checked !== "ok") {
        setError(checked === "wrong" ? WRONG_PASSWORD : checked === "limited" ? RATE_LIMIT_ERROR : GENERIC_ERROR);
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        const known = PASSWORD_ERRORS[updateError.code ?? ""];
        setError(known ?? (RATE_LIMIT_CODES.includes(updateError.code ?? "") ? RATE_LIMIT_ERROR : GENERIC_ERROR));
        return;
      }
      setCurrent("");
      setPassword("");
      setRepeat("");
      setSubmitted(false);
      // Anyone else who was logged in with the old password (another phone, a stolen session) is logged out. This
      // device stays logged in. A failure here doesn't matter: the password itself is already changed, so the
      // message only says the other devices were logged out when that really worked.
      const others = await supabase.auth.signOut({ scope: "others" }).then(({ error: e2 }) => !e2, () => false);
      setSaved(others ? "others-too" : "yes");
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
    <section className="flex flex-col gap-5">
      <h2 className="text-[16px] font-semibold">Change password</h2>

      <form onSubmit={handleSubmit} noValidate method="post" className="flex w-full flex-col gap-5">
        <Field
          label="Current password*"
          name="current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={setCurrent}
          invalid={currentBad}
        />
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

        <button
          type="submit"
          disabled={saving}
          className="mt-4 cursor-pointer self-center bg-black px-12 py-2.75 font-bold text-white disabled:cursor-wait disabled:opacity-60"
        >
          Change password
        </button>

        {/* Not in the design yet: the result. */}
        {saved !== "no" && (
          <p role="status" className="text-center text-[14px] font-semibold">
            Your password was changed.{saved === "others-too" && " Other devices were logged out."}
          </p>
        )}
        {error && (
          <p role="alert" className="text-center text-[14px] text-red-600">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
