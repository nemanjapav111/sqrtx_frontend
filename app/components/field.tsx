"use client";

import Image from "next/image";
import { useId, useState } from "react";
// Imported (not from /public) so Next fingerprints the files and browsers cache them permanently.
import eye from "./eye.svg";
import eyeOff from "./eye-off.svg";

// Labelled input with an underline (no box). Password fields get a show/hide eye button.
// This is a client component only because of the show/hide state.
export default function Field({
  label,
  name,
  type,
  autoComplete,
  hint,
  below,
  value,
  onChange,
  invalid,
}: {
  label: string;
  name: string;
  type: "email" | "password";
  autoComplete: string;
  hint?: string; // gray helper text under the underline (register)
  below?: React.ReactNode; // anything else under the underline, like the "Forgot password?" link (log in)
  value: string;
  onChange: (value: string) => void;
  invalid: boolean; // draws the underline red
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="flex w-full flex-col gap-2.25">
      <label htmlFor={id} className="text-[14px] font-semibold">
        {label}
      </label>
      <div className="flex flex-col gap-1">
        {/* Underline is the bottom border (-mb-px so it takes no height, like the design);
            the shadow thickens it while typing as a keyboard focus cue. */}
        <div
          className={`-mb-px flex items-center border-b pb-1 ${
            invalid
              ? "border-red-600 focus-within:shadow-[0_1px_0_0_#dc2626]"
              : "border-black focus-within:shadow-[0_1px_0_0_black]"
          }`}
        >
          <input
            id={id}
            name={name}
            type={isPassword && visible ? "text" : type}
            autoComplete={autoComplete}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={invalid}
            aria-describedby={hint ? `${id}-hint` : undefined}
            className="h-4.75 min-w-0 flex-1 bg-transparent outline-none"
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              aria-label={visible ? "Hide password" : "Show password"}
              className="size-5 shrink-0 cursor-pointer"
            >
              <Image src={visible ? eye : eyeOff} alt="" width={20} height={20} />
            </button>
          )}
        </div>
        {hint && (
          <p id={`${id}-hint`} className="text-[13px] font-medium text-[#4b5563]">
            {hint}
          </p>
        )}
        {below}
      </div>
    </div>
  );
}
