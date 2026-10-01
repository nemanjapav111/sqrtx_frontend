"use client";

import { useId, useState } from "react";
import { ApiError } from "@/lib/api";
import { GENERIC_ERROR } from "@/lib/auth-messages";
import { CONTACT_EMAIL_MAX, CONTACT_MESSAGE_MAX, CONTACT_NAME_MAX, sendContactMessage } from "@/lib/contact";
import { emailOk } from "@/lib/validation";

// The "Contact us" form of the Contact page (Figma "Contact Phone/Tablet/Desktop new" 2157:611, 2036:761, 1681:347): Full name and
// Email on a thin grey line (side by side on a desktop), a Message box and a black Send button. What it does on Send is not drawn:
// the message is emailed to the business (POST /contact), the visitor's own address is where the business answers; afterwards the
// form is emptied and says it was sent. The red line and the focus line are the site's usual way of showing a field that needs fixing.
//  - Phone: the fields are 328px wide (the content's width), the message box 300px tall, the button centered.
//  - Tablet (500px of content): the fields and the box 500px wide, centered.
//  - Desktop (1030px of content): the form is 924px wide, Full name and Email side by side (437px each), the message label 16px and
//    its box 413px tall, the button at the left. The labels carry a "*" on the desktop design only; every field is required everywhere.
// Not in the design, so placeholders: the words after sending and for each thing that can go wrong.

const LINE = "border-b border-[#b8b8b8] focus:border-black focus-visible:outline-none";

export default function ContactForm({ userId }: { userId: string }) {
  const ids = { name: useId(), email: useId(), message: useId() };
  const [values, setValues] = useState({ name: "", email: "", message: "", website: "" });
  const [submitted, setSubmitted] = useState(false); // red lines stay hidden until the first Send
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const set = (change: Partial<typeof values>) => setValues((v) => ({ ...v, ...change }));

  const bad = {
    name: values.name.trim() === "" || values.name.trim().length > CONTACT_NAME_MAX,
    email: !emailOk(values.email) || values.email.trim().length > CONTACT_EMAIL_MAX,
    message: values.message.trim() === "" || values.message.trim().length > CONTACT_MESSAGE_MAX,
  };
  const invalid = (field: keyof typeof bad) => submitted && bad[field];

  function problemText(err: unknown): string {
    if (!(err instanceof ApiError)) return GENERIC_ERROR; // no connection, or the site can't reach the API
    if (err.status === 429) return "You have sent several messages already. Please try again later.";
    if (err.status === 503) return "Messages can't be sent right now. Please use the email or phone number above.";
    if (err.status === 404) return "This business can't receive messages right now.";
    if (err.status === 400) return err.messages.join(". ") || GENERIC_ERROR;
    return GENERIC_ERROR;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    setSubmitted(true);
    setError(null);
    const first = (["name", "email", "message"] as const).find((field) => bad[field]);
    if (first) {
      document.getElementById(ids[first])?.focus(); // the cursor goes to the first field that needs fixing
      return;
    }
    setStatus("sending");
    try {
      await sendContactMessage(userId, values);
      setValues({ name: "", email: "", message: "", website: "" });
      setSubmitted(false);
      setStatus("sent");
    } catch (err) {
      setError(problemText(err));
      setStatus("idle");
    }
  }

  const label = "text-[14px] leading-[1.21] font-semibold @min-[1030px]:text-[14px]";
  const star = <span className="hidden @min-[1030px]:inline">*</span>;

  return (
    <form onSubmit={handleSubmit} noValidate className="relative flex w-full flex-col">
      <div className="flex flex-col gap-12.5 @min-[1030px]:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-2.25">
          <label htmlFor={ids.name} className={label}>
            Full name{star}
          </label>
          <input
            id={ids.name}
            name="name"
            type="text"
            autoComplete="name"
            maxLength={CONTACT_NAME_MAX}
            value={values.name}
            onChange={(e) => set({ name: e.target.value })}
            aria-invalid={invalid("name")}
            className={`h-5.75 w-full bg-transparent text-[16px] leading-[1.21] ${LINE} ${invalid("name") ? "!border-red-600" : ""}`}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2.25">
          <label htmlFor={ids.email} className={label}>
            Email{star}
          </label>
          <input
            id={ids.email}
            name="email"
            type="email"
            autoComplete="email"
            maxLength={CONTACT_EMAIL_MAX}
            value={values.email}
            onChange={(e) => set({ email: e.target.value })}
            aria-invalid={invalid("email")}
            className={`h-5.75 w-full bg-transparent text-[16px] leading-[1.21] ${LINE} ${invalid("email") ? "!border-red-600" : ""}`}
          />
        </div>
      </div>

      <div className="mt-11 flex flex-col gap-2.25 @min-[1030px]:gap-3.5">
        <label htmlFor={ids.message} className={`${label} @min-[1030px]:text-[16px]`}>
          Message{star}
        </label>
        <textarea
          id={ids.message}
          name="message"
          maxLength={CONTACT_MESSAGE_MAX}
          value={values.message}
          onChange={(e) => set({ message: e.target.value })}
          aria-invalid={invalid("message")}
          className={`h-75 w-full resize-none border bg-transparent p-2.5 text-[16px] leading-[1.21] focus-visible:outline-none @min-[1030px]:h-103.25 ${
            invalid("message") ? "border-red-600" : "border-[#b8b8b8] focus:border-black"
          }`}
        />
      </div>

      {/* A trap for programs that fill in every field (see POST /contact in the API notes): out of sight, out of the tab order and
          hidden from a screen reader, so a person never meets it. */}
      <div aria-hidden className="absolute -left-2499.75 h-px w-px overflow-hidden">
        <label>
          Leave this empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => set({ website: e.target.value })} />
        </label>
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-5 flex h-10.25 w-49.25 cursor-pointer items-center justify-center self-center bg-black text-[16px] leading-[1.21] font-bold text-white disabled:cursor-wait disabled:opacity-60 @min-[1030px]:mt-3.5 @min-[1030px]:self-start"
      >
        {status === "sending" ? "Sending…" : "Send"}
      </button>

      {/* Under the button: what happened. aria-live so it is read out when it appears. */}
      <div aria-live="polite" className="min-h-6 pt-3 text-center text-[14px] @min-[1030px]:text-left">
        {status === "sent" && <p className="text-[#111]">Your message was sent. The business will answer you by email.</p>}
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
