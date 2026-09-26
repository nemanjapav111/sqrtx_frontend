"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import BigLogo from "@/app/components/big-logo";
import Field from "@/app/components/field";
import { ApiError } from "@/lib/api";
import { GENERIC_ERROR } from "@/lib/auth-messages";
import {
  SITE_HOST,
  cleanSlug,
  createProfile,
  emptyValues,
  invalidFields,
  isSlugAvailable,
  logoProblem,
  slugOk,
  updateProfile,
  valuesFromProfile,
  type BusinessProfile,
  type FieldName,
  type ProfileValues,
} from "@/lib/business-profile";
import { getOnboardingState, pathForStep } from "@/lib/onboarding";
import ArrowIcon from "../arrow-icon";
import AddressField from "./address-field";
import CategorySelect from "./category-select";
import LogoPicker from "./logo-picker";

// The form control that gets the cursor for each field that needs fixing.
const CONTROL_NAME: Record<FieldName, string> = {
  companyName: "companyName",
  category: "category",
  place: "address",
  contactEmail: "contactEmail",
  phone: "phone",
  facebook: "facebook",
  instagram: "instagram",
  slug: "slug",
  provides: "products",
  logo: "logo",
};

// A checkbox with its label before it, like the design. Bordered box; a black check mark when checked.
const CHECK =
  "checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2020%2020%22%3E%3Cpath%20d=%22M4.5%2010.5l3.5%203.5L15.5%206%22%20fill=%22none%22%20stroke=%22black%22%20stroke-width=%222.5%22/%3E%3C/svg%3E')]";
function ProvidesBox({ name, label, checked, invalid, onChange }: { name: string; label: string; checked: boolean; invalid: boolean; onChange: (v: boolean) => void }) {
  return (
    // The padding makes the whole row easy to tap on a phone.
    <label className="flex cursor-pointer items-center gap-1 py-3 text-[14px] font-semibold">
      {label}
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`size-5 appearance-none border bg-white bg-center bg-no-repeat ${invalid ? "border-red-600" : "border-black"} ${CHECK}`}
      />
    </label>
  );
}

// The "Public profile" page. `profile` is null the first time (create) and the saved profile when the user
// comes back to edit it from a later step (update).
export default function CompanyForm({ profile }: { profile: BusinessProfile | null }) {
  const router = useRouter();
  const editing = profile !== null;
  const [values, setValues] = useState<ProfileValues>(() => (profile ? valuesFromProfile(profile) : emptyValues));
  const set = (change: Partial<ProfileValues>) => setValues((v) => ({ ...v, ...change }));

  // Red lines stay hidden until the user clicks Next once. After that they update as the user types.
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false); // only used to grey out the button
  const inFlight = useRef(false); // the real "already sending" guard: state would be stale for a second submit in the same instant
  const [error, setError] = useState<string | null>(null);

  // What we know about the page name in the "Your URL" box. The answer belongs to one specific name,
  // so as soon as the box holds another name the answer no longer counts.
  const [slugCheck, setSlugCheck] = useState<{ slug: string; state: "checking" | "available" | "taken" } | null>(null);
  const [savedSlug] = useState(() => (profile ? valuesFromProfile(profile).slug : null)); // the name they already have
  const slugState = slugCheck?.slug === values.slug ? slugCheck.state : null;
  const slugTaken = slugState === "taken";

  const logoIssue = values.logo ? logoProblem(values.logo) : null;
  const bad = new Set(submitted ? invalidFields(values, !!profile?.logo) : []);
  const invalid = (field: FieldName) => bad.has(field) || (field === "slug" && slugTaken);

  // When the user leaves the box: ask the server if the name is free. Shows a green check mark or "taken".
  async function checkSlug() {
    const slug = values.slug;
    if (!slugOk(slug) || slug === savedSlug) return; // not a valid name yet, or the one they already own
    if (slugCheck?.slug === slug) return; // already asked (or asking) about this name
    setSlugCheck({ slug, state: "checking" });
    try {
      const available = await isSlugAvailable(slug);
      // If the user changed the name while we were asking, this answer is for an old name: ignore it.
      setSlugCheck((now) => (now?.slug === slug ? { slug, state: available ? "available" : "taken" } : now));
    } catch {
      setSlugCheck((now) => (now?.slug === slug ? null : now)); // couldn't ask: say nothing, saving checks again
    }
  }

  async function goToCurrentStep() {
    const state = await getOnboardingState();
    router.push(pathForStep(state.step));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    const form = e.currentTarget;
    setSubmitted(true);
    setError(null);

    // Send the cursor to the first field that needs fixing. A name we already know is taken counts too.
    const first = invalidFields(values, !!profile?.logo)[0] ?? (slugTaken ? "slug" : undefined);
    if (first) {
      (form.elements.namedItem(CONTROL_NAME[first]) as HTMLElement | null)?.focus();
      return;
    }

    inFlight.current = true;
    setSending(true);
    try {
      await (editing ? updateProfile(values) : createProfile(values));
      await goToCurrentStep();
    } catch (err) {
      await handleError(err, form);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  async function handleError(err: unknown, form: HTMLFormElement) {
    if (!(err instanceof ApiError)) return setError(GENERIC_ERROR); // no connection, or the site can't reach the API
    const text = err.messages.join(". ");
    if (err.status === 409 && /company url/i.test(text)) {
      setSlugCheck({ slug: values.slug, state: "taken" }); // someone took it after the check above, or it was never checked
      (form.elements.namedItem("slug") as HTMLElement | null)?.focus();
    } else if (err.status === 409) {
      // The profile was already saved (a double click, or another tab): carry on with the saved one.
      try {
        await goToCurrentStep();
      } catch {
        setError(GENERIC_ERROR);
      }
    } else if (err.status === 413) setError("The logo is larger than 10 MB.");
    else if (err.status === 502) setError("We couldn't upload the logo. Please try again.");
    else if (err.status === 400) setError(text || GENERIC_ERROR); // a rule the form didn't catch
    else setError(GENERIC_ERROR);
  }

  return (
    <>
      <BigLogo />
      <h1 className="pt-9.5 pb-2 text-[20px] font-semibold">Public profile</h1>
      <p className="pb-10 font-semibold">This information will be publicly visible.</p>

      {/* noValidate: we draw our own red underline instead of the browser's pop-up messages. */}
      <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col items-center">
        <div className="flex w-full max-w-135 flex-col gap-5 px-5 pb-17.5">
          <Field
            label="Company name*"
            name="companyName"
            type="text"
            autoComplete="organization"
            hint="This will be displayed next to your company logo."
            maxLength={255}
            value={values.companyName}
            onChange={(v) => set({ companyName: v })}
            invalid={invalid("companyName")}
          />
          <CategorySelect value={values.category} invalid={invalid("category")} onChange={(v) => set({ category: v })} />
          <AddressField
            text={values.addressText}
            place={values.place}
            invalid={invalid("place")}
            onText={(v) => set({ addressText: v })}
            onPlace={(v) => set({ place: v })}
          />
          <Field
            label="Contact email*"
            name="contactEmail"
            type="email"
            autoComplete="email"
            value={values.contactEmail}
            onChange={(v) => set({ contactEmail: v })}
            invalid={invalid("contactEmail")}
          />
          <Field
            label="Phone (optional)"
            name="phone"
            type="tel"
            autoComplete="tel"
            hint="Include country code (e.g., +1)."
            className="max-w-62.5"
            maxLength={255}
            value={values.phone}
            onChange={(v) => set({ phone: v })}
            invalid={invalid("phone")}
          />
          <Field
            label="Hours (optional)"
            name="hours"
            type="text"
            hint="Example: Mon-Sat 5am-7pm, Sunday Closed"
            maxLength={255}
            value={values.hours}
            onChange={(v) => set({ hours: v })}
            invalid={false}
          />
          <Field
            label="Facebook link (optional)"
            name="facebook"
            type="url"
            maxLength={255}
            value={values.facebook}
            onChange={(v) => set({ facebook: v })}
            invalid={invalid("facebook")}
          />
          <Field
            label="Instagram link (optional)"
            name="instagram"
            type="url"
            maxLength={255}
            value={values.instagram}
            onChange={(v) => set({ instagram: v })}
            invalid={invalid("instagram")}
          />
          <Field
            label="Your URL*"
            name="slug"
            type="text"
            prefix={`${SITE_HOST}/`}
            maxLength={50}
            value={values.slug}
            onChange={(v) => set({ slug: cleanSlug(v) })} // only lowercase letters, digits and dashes can be typed
            onBlur={checkSlug}
            invalid={invalid("slug")}
            trailing={
              slugState === "available" && (
                <>
                  <svg aria-hidden viewBox="0 0 20 20" className="size-5 shrink-0" fill="none" stroke="#009a1c" strokeWidth="2.5">
                    <path d="M4.5 10.5l3.5 3.5L15.5 6" />
                  </svg>
                  <span role="status" className="sr-only">
                    This address is available
                  </span>
                </>
              )
            }
            message={
              slugState === "checking" ? (
                <p className="text-[13px] font-medium text-[#4b5563]">Checking…</p>
              ) : slugTaken ? (
                <p role="alert" className="text-[13px] font-medium text-red-600">
                  This address is already taken.
                </p>
              ) : null
            }
          />

          <div role="group" aria-labelledby="provides-label" className="flex w-full flex-col gap-2.25">
            <p id="provides-label" className="text-[14px] font-semibold">
              What does your company provide? (check one or both)*
            </p>
            <div className="flex items-center gap-7.75">
              <ProvidesBox name="products" label="Products" checked={values.products} invalid={invalid("provides")} onChange={(v) => set({ products: v })} />
              <ProvidesBox name="services" label="Services" checked={values.services} invalid={invalid("provides")} onChange={(v) => set({ services: v })} />
            </div>
          </div>

          <LogoPicker
            file={values.logo}
            saved={profile?.logo ?? null}
            invalid={invalid("logo")}
            problem={logoIssue}
            onPick={(file) => set({ logo: file })}
          />
        </div>

        <button
          type="submit"
          disabled={sending}
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
        <div className="pb-17.5" />
      </form>
    </>
  );
}
