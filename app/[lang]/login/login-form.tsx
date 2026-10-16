"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import BigLogo from "@/app/[lang]/components/big-logo";
import Field from "@/app/[lang]/components/field";
import { useCommonText } from "@/app/[lang]/components/lang-context";
import type { Dictionary } from "@/app/[lang]/dictionaries/en";
import { RATE_LIMIT_CODES } from "@/lib/auth-messages";
import { getHomePath } from "@/lib/onboarding";
import { supabase } from "@/lib/supabase";
import { useRedirectIfSignedIn } from "@/lib/use-redirect-if-signed-in";
import { emailOk } from "@/lib/validation";

// "Not confirmed yet" (text.notConfirmed) only comes back when the password was right, so showing it doesn't reveal who has an account.

// The "Forgot password?" link from the design. The design's "Forgot email?" link is deliberately not here: someone
// who forgot their login email can't be identified by anything else, so changing it is planned for the account
// settings, for signed-in users (see PROJECT_NOTES).
const helperLink = (text: string, href: string) => (
  <Link href={href} className="self-end py-1 text-[14px] font-medium">
    {text}
  </Link>
);

export default function LoginForm({ text }: { text: Dictionary["auth"]["login"] }) {
  const router = useRouter();
  const common = useCommonText();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Red lines stay hidden until the user clicks Log in once. After that they update as the user types.
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false); // only used to grey out the button
  const inFlight = useRef(false); // the real "already sending" guard: state would be stale for a second submit in the same instant
  const [error, setError] = useState<string | null>(null);
  const redirecting = useRedirectIfSignedIn(); // already signed in: not shown this page

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
        if (signInError.code === "invalid_credentials") setError(text.wrongLogin);
        else if (signInError.code === "email_not_confirmed") setError(text.notConfirmed);
        else setError(RATE_LIMIT_CODES.includes(signInError.code ?? "") ? common.rateLimitError : common.genericError);
        return;
      }

      // Signed in. Ask the server how far this user got in registration and send them to that page.
      try {
        router.push(await getHomePath());
      } catch {
        setError(text.progressError);
      }
    } catch {
      setError(common.genericError);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  if (redirecting) return <BigLogo />;

  // noValidate: we draw our own red underline instead of the browser's pop-up messages.
  // method="post" so the password can never end up in the URL if this runs before the page is ready.
  return (
    <>
      <BigLogo />
      <h1 className="pt-9.5 pb-10 text-[26px] leading-[1.2] font-bold md:pt-6 md:pb-6">{text.title}</h1>

      <form onSubmit={handleSubmit} noValidate method="post" className="flex w-full flex-col items-center">
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
          <Field
            label={common.password}
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            invalid={passwordBad}
            below={helperLink(text.forgot, "/forgot-password")}
          />
        </div>

        <div className="w-full max-w-135 px-5">
          <button
            type="submit"
            disabled={sending}
            className="flex w-full cursor-pointer items-center justify-center bg-black py-3.5 font-bold text-white disabled:cursor-wait disabled:opacity-60"
          >
            {text.submit}
          </button>
        </div>

        {/* Wrong login, not confirmed yet, rate limit, or no connection. Not in the design yet. */}
        {error && (
          <p role="alert" className="w-full max-w-135 px-5 pt-5 text-center text-[14px] text-red-600">
            {error}
          </p>
        )}
      </form>

      {/* For someone who has no account yet and landed here. */}
      <p className="pt-6 text-[14px] text-[#4b5563]">
        {text.newHere}{" "}
        <Link href="/register" className="font-semibold text-black underline">
          {text.createPage}
        </Link>
      </p>
    </>
  );
}
