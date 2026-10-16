"use client";

import { useRef, useState } from "react";
import Field from "@/app/[lang]/components/field";
import { useCommonText } from "@/app/[lang]/components/lang-context";
import type { Dictionary } from "@/app/[lang]/dictionaries/en";
import { checkPassword } from "@/lib/account";
import { RATE_LIMIT_CODES } from "@/lib/auth-messages";
import { supabase } from "@/lib/supabase";
import { passwordOk } from "@/lib/validation";

// "Change password" for someone who is logged in and knows their password (someone who forgot it uses "Forgot password?"
// on the log in page). No design for it: it is built from the change email form and the reset password page (the same
// hint, the same rules), and all its wording is placeholder. It asks for the current password first.
export default function ChangePasswordForm({ text, currentEmail }: { text: Dictionary["account"]["settings"]; currentEmail: string }) {
  const common = useCommonText();
  const t = text.password;
  const passwordErrors: Record<string, string> = { weak_password: common.weakPassword, same_password: t.samePassword };
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
        setError(checked === "wrong" ? text.wrongPassword : checked === "limited" ? common.rateLimitError : common.genericError);
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        const known = passwordErrors[updateError.code ?? ""];
        setError(known ?? (RATE_LIMIT_CODES.includes(updateError.code ?? "") ? common.rateLimitError : common.genericError));
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
      setError(common.genericError);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  // noValidate: we draw our own red underline instead of the browser's pop-up messages.
  // method="post" so a password can never end up in the URL if this runs before the page is ready.
  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-[16px] font-semibold">{t.title}</h2>

      <form onSubmit={handleSubmit} noValidate method="post" className="flex w-full flex-col gap-5">
        <Field
          label={text.currentPassword}
          name="current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={setCurrent}
          invalid={currentBad}
        />
        <Field
          label={t.newPassword}
          name="password"
          type="password"
          autoComplete="new-password"
          hint={common.passwordRule}
          value={password}
          onChange={setPassword}
          invalid={passwordBad}
        />
        <Field
          label={t.repeat}
          name="repeat"
          type="password"
          autoComplete="new-password"
          message={repeatBad && repeat !== "" ? <p className="text-[13px] font-medium text-red-600">{t.mismatch}</p> : null}
          value={repeat}
          onChange={setRepeat}
          invalid={repeatBad}
        />

        <button
          type="submit"
          disabled={saving}
          className="mt-4 w-full cursor-pointer bg-black py-3.5 font-bold text-white disabled:cursor-wait disabled:opacity-60"
        >
          {t.button}
        </button>

        {/* Not in the design yet: the result. */}
        {saved !== "no" && (
          <p role="status" className="text-center text-[14px] font-semibold">
            {t.changed}
            {saved === "others-too" && t.othersLoggedOut}
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
