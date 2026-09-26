"use client";

import Image from "next/image";
import { useId, useState } from "react";
// Imported (not from /public) so Next fingerprints the files and browsers cache them permanently.
import eye from "./eye.svg";
import eyeOff from "./eye-off.svg";

// The look shared by every form field: a label, an underline (no box), and optional helper text under it.
// The control itself (input, select, ...) is passed as children and sits on the underline.
export function FieldShell({
  id,
  label,
  invalid,
  hint,
  message,
  dropdown,
  below,
  className = "",
  children,
}: {
  id: string; // the id of the control, so the label points at it
  label: string;
  invalid: boolean; // draws the underline red
  hint?: string; // gray helper text under the underline
  // A status/error line that comes and goes (e.g. "Checking…", "already taken"). Pass it (even as null)
  // to reserve its line's height up front, the same way a static hint already keeps its space, so the rest
  // of the form doesn't jump when the message appears or clears.
  message?: React.ReactNode;
  // An absolutely positioned panel (e.g. an autocomplete list) anchored right under the input line itself,
  // regardless of whatever hint, message or below content follows it.
  dropdown?: React.ReactNode;
  below?: React.ReactNode; // anything else under the underline, in normal flow (e.g. a "Forgot password?" link)
  className?: string; // for example a maximum width
  children: React.ReactNode;
}) {
  return (
    <div className={`flex w-full flex-col gap-2.25 ${className}`}>
      <label htmlFor={id} className="text-[14px] font-semibold">
        {label}
      </label>
      <div className="flex flex-col gap-1">
        {/* Underline is the bottom border (-mb-px so it takes no height, like the design);
            the shadow thickens it while typing as a keyboard focus cue. relative so `dropdown`
            anchors right under this row and not under whatever hint/message/below follows it. */}
        <div
          className={`relative -mb-px flex items-center border-b pb-1 ${
            invalid
              ? "border-red-600 focus-within:shadow-[0_1px_0_0_#dc2626]"
              : "border-black focus-within:shadow-[0_1px_0_0_black]"
          }`}
        >
          {children}
          {dropdown}
        </div>
        {hint && (
          <p id={`${id}-hint`} className="text-[13px] font-medium text-[#4b5563]">
            {hint}
          </p>
        )}
        {message !== undefined && <div className="min-h-4.5">{message}</div>}
        {below}
      </div>
    </div>
  );
}

// A text-like input on the underline. Password fields get a show/hide eye button.
// This is a client component only because of the show/hide state.
export default function Field({
  label,
  name,
  type,
  autoComplete,
  hint,
  message,
  below,
  prefix,
  className,
  maxLength,
  value,
  onChange,
  onBlur,
  trailing,
  invalid,
}: {
  label: string;
  name: string;
  type: "text" | "email" | "password" | "tel" | "url";
  autoComplete?: string;
  hint?: string; // gray helper text under the underline (register)
  message?: React.ReactNode; // a status/error line with its space reserved up front, see FieldShell
  below?: React.ReactNode; // anything else under the underline, like the "Forgot password?" link (log in)
  prefix?: string; // fixed text before the input, like "sqrtx.co/"
  className?: string;
  maxLength?: number;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void; // the user left the field
  trailing?: React.ReactNode; // at the end of the line, like a green check mark
  invalid: boolean;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <FieldShell id={id} label={label} invalid={invalid} hint={hint} message={message} below={below} className={className}>
      {prefix && <span className="shrink-0 text-[#4b5563]">{prefix}</span>}
      <input
        id={id}
        name={name}
        type={isPassword && visible ? "text" : type}
        autoComplete={autoComplete}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={invalid}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="h-4.75 min-w-0 flex-1 bg-transparent outline-none"
      />
      {trailing}
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
    </FieldShell>
  );
}
