"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import BigLogo from "@/app/components/big-logo";
import PageHeading from "@/app/components/page-heading";
import PendingOverlay from "@/app/components/pending-overlay";
import { ApiError } from "@/lib/api";
import { GENERIC_ERROR } from "@/lib/auth-messages";
import { finishOnboarding, pathForStep } from "@/lib/onboarding";

// A checkbox with its sentence after it, like the design. Bordered box; a black check mark when checked. Mirrors the
// "Products"/"Services" checkbox in company-form.tsx (a 20px box with a 44px tap area, the same approved deviation from
// Figma's 11px box, noted in PROJECT_NOTES), with two differences:
// - The sentence holds links (terms, privacy), so it is NOT part of the label: only the box and the 44 x 44 px area
//   around it tick the box. Tapping the words, or missing a link by a finger's width, does nothing.
// - The sentence comes after the box, and the box's tap area reaches 12px to the left of the form column so the box
//   itself lines up with the "About*" label above it.
const CHECK =
  "checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2020%2020%22%3E%3Cpath%20d=%22M4.5%2010.5l3.5%203.5L15.5%206%22%20fill=%22none%22%20stroke=%22black%22%20stroke-width=%222.5%22/%3E%3C/svg%3E')]";
function TermsBox({ checked, invalid, onChange }: { checked: boolean; invalid: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center text-[14px] font-semibold">
      <label className="-ml-3 flex size-11 shrink-0 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          name="termsAccepted"
          aria-labelledby="terms-sentence"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={`size-5 appearance-none border bg-white bg-center bg-no-repeat ${invalid ? "border-red-600" : "border-black"} ${CHECK}`}
        />
      </label>
      {/* The links open in a new tab so what the user typed above is not lost. The wording adds the privacy policy to
          the design's "I accept the terms and conditions": the API records both versions when the user finishes. */}
      <span id="terms-sentence" className="py-1">
        I accept the{" "}
        <Link href="/terms" target="_blank" rel="noopener" className="underline">
          terms and conditions
        </Link>{" "}
        and the{" "}
        <Link href="/privacy" target="_blank" rel="noopener" className="underline">
          privacy policy
        </Link>
      </span>
    </div>
  );
}

// The last registration page: the "about the company" text, terms acceptance, and Finish. No Skip - unlike the
// products/services pages this one isn't optional, and there's nothing after it to skip to.
// `pending`, set by FinalStep while it doesn't yet know whether this visitor belongs here: the form is shown
// anyway (empty), under a PendingOverlay, and marked `inert` so it can't be used before that is known.
export default function FinalForm({ pending, onRetry }: { pending?: "loading" | "error"; onRetry: () => void }) {
  const router = useRouter();
  const [about, setAbout] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Red lines/checkbox stay hidden until the user tries to finish once.
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false); // the real "already working" guard: state would be stale for a second click in the same instant
  const [error, setError] = useState<string | null>(null);

  const aboutInvalid = submitted && !about.trim();
  const termsInvalid = submitted && !termsAccepted;

  function showError(err: unknown) {
    if (!(err instanceof ApiError)) return setError(GENERIC_ERROR); // no connection, or the site can't reach the API
    if (err.status === 400) setError(err.messages.join(". ") || GENERIC_ERROR); // a rule the form didn't catch
    else setError(GENERIC_ERROR);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    setSubmitted(true);
    setError(null);

    // Send the cursor to whichever needs fixing first.
    const form = e.currentTarget;
    if (!about.trim()) return void (form.elements.namedItem("about") as HTMLElement | null)?.focus();
    if (!termsAccepted) return void (form.elements.namedItem("termsAccepted") as HTMLElement | null)?.focus();

    inFlight.current = true;
    setBusy(true);
    try {
      const state = await finishOnboarding(about);
      router.push(pathForStep(state.step));
    } catch (err) {
      showError(err);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <BigLogo />
      <PageHeading title="About your company" />

      {/* relative: PendingOverlay (absolute) floats over the form while `pending`. `inert` on the form itself
          (not just a visual dimming) is what actually stops it being typed into or submitted meanwhile. */}
      <div className="relative w-full">
        {/* noValidate: we draw our own red underline instead of the browser's pop-up messages. */}
        <form
          onSubmit={handleSubmit}
          noValidate
          inert={!!pending}
          className={`flex w-full flex-col items-center ${pending ? "opacity-40" : ""}`}
        >
          {/* One field group, matching the design: label, textarea and the terms row all 9px (gap-2.25) apart,
              not the wider gap used between separate fields on the product/service forms. */}
          <div className="flex w-full max-w-135 flex-col gap-2.25 px-5">
            <label htmlFor="about" className="text-[14px] font-semibold">
              About*
            </label>
            <textarea
              id="about"
              name="about"
              aria-invalid={aboutInvalid}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className={`h-75 w-full resize-none border p-1 text-[16px] text-[#111] outline-none focus:shadow-[0_0_0_1px_black] ${
                aboutInvalid ? "border-red-600 focus:shadow-[0_0_0_1px_#dc2626]" : "border-black"
              }`}
            />
            <TermsBox checked={termsAccepted} invalid={termsInvalid} onChange={setTermsAccepted} />
          </div>

          <div className="flex flex-col items-center gap-2.5 pt-17.5 pb-17.5 md:pt-8 md:pb-8">
            <button
              type="submit"
              disabled={busy}
              className="flex cursor-pointer items-center bg-black px-17.25 py-2.75 font-bold text-white disabled:cursor-wait disabled:opacity-60"
            >
              Finish
            </button>
            <p className="text-center text-[14px] font-semibold">30-day free trial. Upgrade only if you love it.</p>
          </div>

          {/* Problems from the server or the connection. Not in the design yet. */}
          {error && (
            <p role="alert" className="w-full max-w-135 px-5 pb-10 text-center text-[14px] text-red-600">
              {error}
            </p>
          )}
        </form>
        {pending && <PendingOverlay state={pending} onRetry={onRetry} />}
      </div>
    </>
  );
}
