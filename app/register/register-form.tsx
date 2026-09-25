"use client";

import { useState } from "react";
import Field from "./field";

// name@domain.tld: no spaces, no empty parts, and the ending (tld) is at least 2 characters.
// (Checking that the address really exists needs a confirmation email.)
const emailOk = (v: string) => /^[^\s@]+@([^\s@.]+\.)+[^\s@.]{2,}$/.test(v.trim());

// At least 8 characters, one uppercase letter (any language) and one digit.
const passwordOk = (v: string) => v.length >= 8 && v !== v.toLowerCase() && /\d/.test(v);

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Errors stay hidden until the user clicks Next once. After that they update as the user types.
  const [submitted, setSubmitted] = useState(false);

  const emailBad = submitted && !emailOk(email);
  const passwordBad = submitted && !passwordOk(password);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);

    // Send the cursor to the first field that needs fixing.
    const field = !emailOk(email) ? "email" : !passwordOk(password) ? "password" : null;
    if (field) {
      (e.currentTarget.elements.namedItem(field) as HTMLInputElement).focus();
      return;
    }
    // TODO: both fields are valid, go to the next registration step.
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
          hint="Minimum 8 characters, uppercase letter, and a number."
          value={password}
          onChange={setPassword}
          invalid={passwordBad}
        />
      </div>

      {/* The arrow is an SVG because the → character isn't in the Inter font files Google serves. */}
      <button
        type="submit"
        className="flex cursor-pointer items-center gap-1 bg-black px-17.25 py-2.75 font-bold text-white"
      >
        Next
        <svg aria-hidden viewBox="0 0 11 12" className="h-3.5 w-3 translate-y-px" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M0 6h9.6M5.1 1.5L9.6 6l-4.5 4.5" />
        </svg>
      </button>
    </form>
  );
}
