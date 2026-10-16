"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import BigLogo from "@/app/[lang]/components/big-logo";
import LogoutButton from "@/app/[lang]/components/logout-button";
import { useCommonText } from "@/app/[lang]/components/lang-context";
import PendingOverlay from "@/app/[lang]/components/pending-overlay";
import ServiceFields, { CONTROL_NAME } from "@/app/[lang]/components/service-fields";
import UploadProgress from "@/app/[lang]/components/upload-progress";
import type { Dictionary } from "@/app/[lang]/dictionaries/en";
import { ApiError } from "@/lib/api";
import { fill } from "@/lib/i18n";
import { completeStep, pageAfter } from "@/lib/onboarding";
import {
  createService,
  emptyService,
  invalidServiceFields,
  isEmptyService,
  type ServiceField,
  type ServiceValues,
} from "@/lib/services";
import type { UploadStatus } from "@/lib/upload";
import ArrowIcon from "../arrow-icon";
import StepProgress from "../step-progress";

// The "Add service" page of registration. Owners can add as many services as they like, one after another, and
// adding services is optional: "Continue" and "Skip for now" both move on to the next step.
// `pending`, set by ServicesStep while it doesn't yet know the real category list: the form is shown anyway
// (empty), under a PendingOverlay, and marked `inert` so it can't be used before that is known. Skip is disabled
// too (it doesn't need the category list, but this page hasn't yet confirmed the visitor belongs on it).
export default function ServiceForm({
  text,
  categories: knownCategories,
  currency,
  pending,
  onRetry,
}: {
  text: Dictionary["registration"]["services"];
  categories: string[];
  currency: string; // the business's currency, for the price box
  pending?: "loading" | "error";
  onRetry: () => void;
}) {
  const router = useRouter();
  const common = useCommonText();
  const [values, setValues] = useState<ServiceValues>(emptyService);
  // The categories services use, offered in the category box (a service with a new one adds it).
  const [categories, setCategories] = useState(knownCategories);

  // Red lines stay hidden until the user tries to add once. After that they update as the user types.
  const [submitted, setSubmitted] = useState(false);
  const [phase, setPhase] = useState<"idle" | "adding" | "moving">("idle"); // only used for the buttons and messages
  const inFlight = useRef(false); // the real "already working" guard: state would be stale for a second click in the same instant
  const leaving = useRef(false); // the next page has been asked for: the button stays off until this page is gone (it came back to life for a moment before)
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null); // "... was added"
  const [added, setAdded] = useState(0); // how many services this page has added so far (the heading says "first" until there is one)
  const [upload, setUpload] = useState<UploadStatus | null>(null); // how the photos' upload is going, while adding
  const busy = phase !== "idle";

  const bad = new Set(submitted ? invalidServiceFields(values) : []);
  const invalid = (field: ServiceField) => bad.has(field);

  // Runs one action at a time: a second click (or Enter) while one is going is ignored.
  async function run(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await action();
    } finally {
      if (!leaving.current) {
        inFlight.current = false;
        setPhase("idle");
      }
    }
  }

  // Validates, uploads and saves the service in the form, then empties the form for the next one. Returns whether it worked.
  async function addService(form: HTMLFormElement): Promise<boolean> {
    setSubmitted(true);
    setError(null);
    setNotice(null);

    // Send the cursor to the first field that needs fixing.
    const first = invalidServiceFields(values)[0];
    if (first) {
      (form.elements.namedItem(CONTROL_NAME[first]) as HTMLElement | null)?.focus();
      return false;
    }

    setPhase("adding");
    try {
      const service = await createService(values, setUpload);
      // A category typed for the first time is offered from now on, on top so it is easy to find. Letter case
      // doesn't make a new category.
      setCategories((known) =>
        known.some((c) => c.toLowerCase() === service.category.toLowerCase()) ? known : [service.category, ...known],
      );
      setValues(emptyService);
      setSubmitted(false);
      setNotice(fill(text.added, { name: service.service_name }));
      setAdded((n) => n + 1);
      return true;
    } catch (err) {
      showError(err);
      return false;
    } finally {
      setUpload(null);
    }
  }

  function showError(err: unknown) {
    if (!(err instanceof ApiError)) return setError(common.genericError); // no connection, or the site can't reach the API
    if (err.status === 413) setError(text.photoTooBig);
    else if (err.status === 502) setError(text.photosUploadFailed);
    else if (err.status === 400) setError(err.messages.join(". ") || common.genericError); // a rule the form didn't catch
    else setError(common.genericError);
  }

  // Tells the server this page is done, then goes to the next page on the user's path (see pageAfter).
  async function goOn() {
    setPhase("moving");
    try {
      const state = await completeStep("services");
      router.push(pageAfter(state, "services"));
      leaving.current = true;
    } catch (err) {
      showError(err);
    }
  }

  // "Save and add another" (and Enter in a text box).
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    void run(async () => void (await addService(form)));
  }

  // "Continue": a service that was filled in but not added yet is added first, so nothing typed is lost.
  function handleNext(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form!;
    void run(async () => {
      if (!isEmptyService(values) && !(await addService(form))) return;
      await goOn();
    });
  }

  // "Skip for now": leaves the form as it is and moves on.
  function handleSkip() {
    void run(async () => {
      setError(null);
      await goOn();
    });
  }

  return (
    <>
      <BigLogo />
      <StepProgress current={3} />
      <h1 className="pt-6 pb-2 text-[26px] leading-[1.2] font-bold">{added === 0 ? text.titleFirst : text.titleNext}</h1>
      <p className="pb-10 text-[#636363] md:pb-6">{text.intro}</p>

      {/* top-0.75 and h-11 match the Back arrow's own box (top-0.75, 44px tall: the usual minimum tap size, around a 28px icon that looks
          unchanged) so the two sit on the same line. */}
      <div className="absolute top-0.75 right-3 flex md:right-[calc(50%-262px)]">
        <LogoutButton />
      </div>

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
          <div className="flex w-full max-w-135 flex-col gap-5 px-5 pb-17.5 md:pb-8">
            <ServiceFields values={values} onChange={setValues} invalid={invalid} categories={categories} currency={currency} />
          </div>

          {/* What is going on (the upload, or "... was added") sits right above the buttons. Its space is always reserved, so it never moves anything. */}
          <div className="flex min-h-9 w-full max-w-135 items-center justify-center px-5 pb-2">
            {phase === "adding" && upload ? (
              <UploadProgress status={upload} what="photo" count={values.images.length} />
            ) : (
              <p role="status" className="text-center text-[13px] font-medium text-[#4b5563]">
                {phase === "adding" ? text.uploading : notice}
              </p>
            )}
          </div>

          <div className="flex w-full max-w-135 flex-col items-center gap-2 px-5">
            {/* Adds what is filled in (if anything) and moves on. */}
            <button
              type="button"
              onClick={handleNext}
              disabled={busy}
              className="flex w-full cursor-pointer items-center justify-center gap-1 bg-black py-3.5 font-bold text-white disabled:cursor-wait disabled:opacity-60"
            >
              {text.continue}
              <ArrowIcon className="h-3.5 w-3 translate-y-px" />
            </button>
            {/* Saves this service and empties the form for the next one. */}
            <button
              type="submit"
              disabled={busy}
              className="flex h-12 w-full cursor-pointer items-center justify-center border border-black bg-white text-[15px] font-semibold disabled:cursor-wait disabled:opacity-60"
            >
              {text.saveAndAdd}
            </button>
            {/* Leaves the form as it is and moves on: grey like Log out, so it does not compete with the two above. */}
            <button
              type="button"
              onClick={handleSkip}
              disabled={busy || !!pending}
              className="flex h-11 cursor-pointer items-center px-3 text-[14px] font-medium text-[#737373] transition-colors hover:text-black focus-visible:text-black focus-visible:outline-2 focus-visible:outline-black disabled:cursor-wait disabled:opacity-60"
            >
              {text.skip}
            </button>
          </div>

          {/* Problems from the server or the connection. Not in the design yet. */}
          {error && (
            <p role="alert" className="w-full max-w-135 px-5 pt-5 text-center text-[14px] text-red-600">
              {error}
            </p>
          )}
          <div className="pb-17.5 md:pb-8" />
        </form>
        {pending && <PendingOverlay state={pending} onRetry={onRetry} />}
      </div>
    </>
  );
}
