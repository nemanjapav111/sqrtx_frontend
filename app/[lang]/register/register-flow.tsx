"use client";

import { useState } from "react";
import BigLogo from "@/app/[lang]/components/big-logo";
import type { Dictionary } from "@/app/[lang]/dictionaries/en";
import { useRedirectIfSignedIn } from "@/lib/use-redirect-if-signed-in";
import RegisterForm from "./register-form";
import StepProgress from "./step-progress";
import VerifyEmail from "./verify-email";

// The two screens of the first registration step: the form, then "check your email".
// The password is only kept in memory while the second screen is open (for "Continue" on another device).
export default function RegisterFlow({
  text,
  verifyText,
}: {
  text: Dictionary["auth"]["register"];
  verifyText: Dictionary["auth"]["verify"];
}) {
  const [sent, setSent] = useState<{ email: string; password: string } | null>(null);
  const [emailToKeep, setEmailToKeep] = useState(""); // pre-fills the form after "Change email"
  const redirecting = useRedirectIfSignedIn(); // already signed in: not shown this page

  if (redirecting) return <BigLogo />;

  if (sent) {
    return (
      <VerifyEmail
        text={verifyText}
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
      <StepProgress current={1} />
      <h1 className="pt-6 pb-2 text-[26px] leading-[1.2] font-bold">{text.title}</h1>
      <p className="pb-10 text-[#636363]">{text.intro}</p>
      <RegisterForm text={text} initialEmail={emailToKeep} onSent={(email, password) => setSent({ email, password })} />
    </>
  );
}
