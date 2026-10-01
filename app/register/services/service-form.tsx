"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import BigLogo from "@/app/components/big-logo";
import CategorySelect from "@/app/components/category-select";
import Field from "@/app/components/field";
import LogoutButton from "@/app/components/logout-button";
import ImageZone from "@/app/components/image-zone";
import PageHeading from "@/app/components/page-heading";
import PendingOverlay from "@/app/components/pending-overlay";
import UploadProgress from "@/app/components/upload-progress";
import { ApiError } from "@/lib/api";
import { GENERIC_ERROR } from "@/lib/auth-messages";
import { completeStep, pageAfter } from "@/lib/onboarding";
import {
  MAX_SERVICE_IMAGES,
  createService,
  emptyService,
  invalidServiceFields,
  isEmptyService,
  type ServiceField,
  type ServiceValues,
} from "@/lib/services";
import type { UploadStatus } from "@/lib/upload";
import ArrowIcon from "../arrow-icon";

// The form control that gets the cursor for each field that needs fixing.
const CONTROL_NAME: Record<ServiceField, string> = {
  name: "serviceName",
  price: "price",
  category: "category",
  images: "images",
  description: "description",
};

// The "Add service" page of registration. Owners can add as many services as they like, one after another, and
// adding services is optional: "Next" and "Skip for now" both move on to the next step.
// `pending`, set by ServicesStep while it doesn't yet know the real category list: the form is shown anyway
// (empty), under a PendingOverlay, and marked `inert` so it can't be used before that is known. Skip is disabled
// too (it doesn't need the category list, but this page hasn't yet confirmed the visitor belongs on it).
export default function ServiceForm({
  categories: knownCategories,
  pending,
  onRetry,
}: {
  categories: string[];
  pending?: "loading" | "error";
  onRetry: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ServiceValues>(emptyService);
  const set = (change: Partial<ServiceValues>) => setValues((v) => ({ ...v, ...change }));
  // The categories services use, offered in the category box (a service with a new one adds it).
  const [categories, setCategories] = useState(knownCategories);

  // Red lines stay hidden until the user tries to add once. After that they update as the user types.
  const [submitted, setSubmitted] = useState(false);
  const [phase, setPhase] = useState<"idle" | "adding" | "moving">("idle"); // only used for the buttons and messages
  const inFlight = useRef(false); // the real "already working" guard: state would be stale for a second click in the same instant
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null); // "... was added"
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
      inFlight.current = false;
      setPhase("idle");
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
      setNotice(`"${service.service_name}" was added.`);
      return true;
    } catch (err) {
      showError(err);
      return false;
    } finally {
      setUpload(null);
    }
  }

  function showError(err: unknown) {
    if (!(err instanceof ApiError)) return setError(GENERIC_ERROR); // no connection, or the site can't reach the API
    if (err.status === 413) setError("A photo is larger than 10 MB.");
    else if (err.status === 502) setError("We couldn't upload the photos. Please try again.");
    else if (err.status === 400) setError(err.messages.join(". ") || GENERIC_ERROR); // a rule the form didn't catch
    else setError(GENERIC_ERROR);
  }

  // Tells the server this page is done, then goes to the next page on the user's path (see pageAfter).
  async function goOn() {
    setPhase("moving");
    try {
      const state = await completeStep("services");
      router.push(pageAfter(state, "services"));
    } catch (err) {
      showError(err);
    }
  }

  // "Add service" (and Enter in a text box).
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    void run(async () => void (await addService(form)));
  }

  // "Next": a service that was filled in but not added yet is added first, so nothing typed is lost.
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
      <PageHeading title="Add service" />

      {/* A plain text link, not a filled button: skipping is the secondary action next to "Next" below, and grey
          isn't otherwise used for anything in this black-and-white design. top-0.75 and h-11 match the Back
          arrow's own box (top-0.75, 44px tall: the usual minimum tap size, around a 28px icon that looks unchanged)
          so the two sit on the same line. Log out shares this wrapper. */}
      <div className="absolute top-0.75 right-3 flex md:right-[calc(50%-262px)]">
        <LogoutButton />
        <button
          type="button"
          onClick={handleSkip}
          disabled={busy || !!pending}
          className="flex h-11 cursor-pointer items-center gap-1.5 px-3 text-[14px] font-medium disabled:cursor-wait disabled:opacity-60"
        >
          Skip for now
          <ArrowIcon className="h-3 w-3.5 translate-y-px" />
        </button>
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
            <Field
              label="Service name*"
              name="serviceName"
              type="text"
              maxLength={255}
              value={values.name}
              onChange={(v) => set({ name: v })}
              invalid={invalid("name")}
            />
            <Field
              label="Price"
              name="price"
              type="text"
              inputMode="decimal"
              prefix="$"
              hint={'Displays "Inquiry" if left blank.'}
              maxLength={13}
              value={values.price}
              onChange={(v) => set({ price: v })}
              invalid={invalid("price")}
            />
            <CategorySelect
              label="Category*"
              placeholder="Select or create a category"
              options={categories}
              allowCreate
              maxRows={5}
              smallPlaceholder
              value={values.category}
              invalid={invalid("category")}
              onChange={(v) => set({ category: v })}
            />
            <ImageZone
              images={values.images}
              invalid={invalid("images")}
              onChange={(update) => setValues((v) => ({ ...v, images: update(v.images) }))}
              maxImages={MAX_SERVICE_IMAGES}
              itemLabel="service"
            />
            <div className="flex w-full flex-col gap-2.25">
              <label htmlFor="service-description" className="text-[14px] font-semibold">
                Description*
              </label>
              <textarea
                id="service-description"
                name="description"
                aria-invalid={invalid("description")}
                value={values.description}
                onChange={(e) => set({ description: e.target.value })}
                className={`h-75 w-full resize-none border p-1 text-[16px] text-[#111] outline-none focus:shadow-[0_0_0_1px_black] ${
                  invalid("description") ? "border-red-600 focus:shadow-[0_0_0_1px_#dc2626]" : "border-black"
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="flex h-10.25 cursor-pointer items-center justify-center border border-black bg-white px-4.75 text-[16px] font-semibold disabled:cursor-wait disabled:opacity-60"
          >
            Add service
          </button>

          {/* The 70px between the two buttons in the design holds the messages, so they never move anything. */}
          <div className="flex h-17.5 w-full max-w-135 items-center justify-center px-5">
            {phase === "adding" && upload ? (
              <UploadProgress status={upload} what="photo" count={values.images.length} />
            ) : (
              <p role="status" className="text-center text-[13px] font-medium text-[#4b5563]">
                {phase === "adding" ? "Uploading your service. This can take a moment." : notice}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={busy}
            className="flex cursor-pointer items-center gap-1 bg-black px-17.25 py-2.75 font-bold text-white disabled:cursor-wait disabled:opacity-60"
          >
            Next
            <ArrowIcon className="h-3.5 w-3 translate-y-px" />
          </button>

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
