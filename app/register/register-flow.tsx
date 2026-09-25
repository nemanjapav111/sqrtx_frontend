"use client";

import { useState } from "react";
import BigLogo from "@/app/components/big-logo";
import RegisterForm from "./register-form";
import VerifyEmail from "./verify-email";

// The two screens of the first registration step: the form, then "check your email".
// The password is only kept in memory while the second screen is open (for "Continue" on another device).
export default function RegisterFlow() {
  const [sent, setSent] = useState<{ email: string; password: string } | null>(null);
  const [emailToKeep, setEmailToKeep] = useState(""); // pre-fills the form after "Change email"

  if (sent) {
    return (
      <VerifyEmail
        email={sent.email}
        password={sent.password}
        onChangeEmail={() => {
          setEmailToKeep(sent.email);
          setSent(null); // also drops the password from memory
        }}
      />
    );
  }

  return (
    <>
      <BigLogo />
      <h1 className="pt-9.5 pb-2 text-[20px] font-semibold">Security</h1>
      <p className="pb-10 font-semibold">Private data used for login.</p>
      <RegisterForm initialEmail={emailToKeep} onSent={(email, password) => setSent({ email, password })} />
    </>
  );
}
