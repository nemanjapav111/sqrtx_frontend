"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BigLogo from "@/app/components/big-logo";
import Field from "@/app/components/field";
import PageHeading from "@/app/components/page-heading";
import PendingOverlay from "@/app/components/pending-overlay";
import UploadProgress from "@/app/components/upload-progress";
import { ApiError } from "@/lib/api";
import { GENERIC_ERROR } from "@/lib/auth-messages";
import {
  COMPANY_NAME_MAX_LENGTH,
  SITE_HOST,
  cleanSlug,
  createProfile,
  emptyValues,
  invalidFields,
  isSlugAvailable,
  logoProblemOf,
  LOGO_KEEP_AS_IS_BYTES,
  logoTypeProblem,
  readImageSize,
  slugOk,
  updateProfile,
  valuesFromProfile,
  type BusinessCategory,
  type BusinessProfile,
  type FieldName,
  type ProfileValues,
} from "@/lib/business-profile";
import { forgetOwnerProfile } from "@/lib/memory-cache";
import { shrinkPhoto } from "@/lib/photos";
import type { UploadStatus } from "@/lib/upload";
import { getOnboardingState, pageAfter, refreshMyPublicPage } from "@/lib/onboarding";
import ArrowIcon from "../arrow-icon";
import AddressField from "./address-field";
import CategorySelect from "@/app/components/category-select";
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
  about: "about",
  slug: "slug",
  provides: "products",
  logo: "logo",
};

// A checkbox with its label before it, like the design. Bordered box; a black check mark when checked.
const CHECK =
  "checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2020%2020%22%3E%3Cpath%20d=%22M4.5%2010.5l3.5%203.5L15.5%206%22%20fill=%22none%22%20stroke=%22black%22%20stroke-width=%222.5%22/%3E%3C/svg%3E')]";
function ProvidesBox({ name, label, checked, invalid, onChange }: { name: string; label: string; checked: boolean; invalid: boolean; onChange: (v: boolean) => void }) {
  return (
    // Only the box and the 44 x 44 px area around it tick it (easy to tap on a phone); tapping the word does nothing,
    // like the terms checkbox on the last page. The area reaches 12px to the right, into the space before the next
    // checkbox, so the spacing stays as designed. The word is not part of the label, so it is linked by aria-labelledby.
    <div className="flex items-center text-[14px] font-semibold">
      <span id={`${name}-label`}>{label}</span>
      <label className="-mr-3 flex size-11 shrink-0 cursor-pointer items-center justify-center">
        <input
          type="checkbox"
          name={name}
          aria-labelledby={`${name}-label`}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={`size-5 appearance-none border bg-white bg-center bg-no-repeat ${invalid ? "border-red-600" : "border-black"} ${CHECK}`}
        />
      </label>
    </div>
  );
}

// The "Public profile" page. `profile` is null the first time (create) and the saved profile when the user
// comes back to edit it from a later step (update).
// `variant`: "registration" (the first registration step: "Next" goes on to the next step) or "account" (the owner
// editing the profile after registration, /account/profile: "Save changes" goes back to the account page and the
// site forgets its saved copy of the public page, so the change shows there at once).
// `pending`, set by CompanyStep while it doesn't yet know which of those `profile` is: the form is shown anyway
// (empty) and marked `inert` so it can't be used before that is known. While it loads it is dimmed under the loading spinner box
// (PendingOverlay), however long it takes; a failure shows the error box with "Try again" in the same place.
export default function CompanyForm({
  profile,
  categories,
  variant = "registration",
  pending,
  onRetry,
}: {
  variant?: "registration" | "account";
  profile: BusinessProfile | null;
  categories: BusinessCategory[]; // what the category box lists (empty while `pending`)
  pending?: "loading" | "error";
  onRetry: () => void;
}) {
  const router = useRouter();
  const editing = profile !== null;
  const account = variant === "account";
  const [values, setValues] = useState<ProfileValues>(() => {
    if (!profile) return emptyValues;
    const saved = valuesFromProfile(profile);
    // A category that is no longer in the list (a profile saved before the list existed) is shown as not picked yet.
    return categories.some((c) => c.id === saved.category) ? saved : { ...saved, category: "" };
  });
  const set = (change: Partial<ProfileValues>) => setValues((v) => ({ ...v, ...change }));

  // Red lines stay hidden until the user clicks Next once. After that they update as the user types.
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false); // only used to grey out the button
  const [upload, setUpload] = useState<UploadStatus | null>(null); // how the logo's upload is going, while saving
  const inFlight = useRef(false); // the real "already sending" guard: state would be stale for a second submit in the same instant
  const leaving = useRef(false); // the next page has been asked for: the button stays off until this page is gone (it came back to life for a moment before)
  const [error, setError] = useState<string | null>(null);

  // What we know about the page name in the "Your URL" box. The answer belongs to one specific name,
  // so as soon as the box holds another name the answer no longer counts.
  const [slugCheck, setSlugCheck] = useState<{ slug: string; state: "checking" | "available" | "taken" } | null>(null);
  const [savedSlug] = useState(() => (profile ? valuesFromProfile(profile).slug : null)); // the name they already have
  const slugState = slugCheck?.slug === values.slug ? slugCheck.state : null;
  const slugTaken = slugState === "taken";

  // The logo that was picked last, and whether it is still being shrunk (see pickLogo).
  const picked = useRef<File | null>(null);
  const [shrinking, setShrinking] = useState(false);
  const logoIssue = logoProblemOf(values, shrinking);
  // Save was pressed while the logo was still being shrunk (a second at most): it is saved the moment the shrunk file is ready, instead of the
  // button being greyed out and back (a flash under the logo every time a big file was picked).
  const formRef = useRef<HTMLFormElement>(null);
  const saveWhenShrunk = useRef(false);
  useEffect(() => {
    if (shrinking || !saveWhenShrunk.current) return;
    saveWhenShrunk.current = false;
    formRef.current?.requestSubmit();
  }, [shrinking]);

  // A new file: it is shown at once, its size is read (the minimum size is about the picture the owner chose), and a big one is shrunk
  // in the browser, the way product photos are (phone photos and big exports are 5 to 25 MB, a logo needs 220 x 136 px): the shrunk
  // file replaces it as what is uploaded. A logo up to 3 MB is left alone, and so is one the browser can't make a WebP of (a
  // see-through logo must not turn into a JPEG on white), so most logos are never re-compressed. If the user picked another file
  // meanwhile, an answer about an old file is dropped. The Save button waits while the shrinking runs (a second at most).
  function pickLogo(file: File | null) {
    picked.current = file;
    set({ logo: file, logoSize: null });
    setShrinking(false);
    if (!file) return;
    readImageSize(file).then((size) => {
      if (picked.current === file) setValues((v) => ({ ...v, logoSize: size }));
    });
    if (logoTypeProblem(file)) return; // not a usable kind of file: the message says so
    setShrinking(true);
    shrinkPhoto(file, { keepTransparency: true, keepIfLighterThan: LOGO_KEEP_AS_IS_BYTES }).then((ready) => {
      if (picked.current !== file) return;
      setShrinking(false);
      if (ready !== file) setValues((v) => ({ ...v, logo: ready }));
    });
  }
  const bad = new Set(submitted ? invalidFields(values, !!profile?.logo, categories, account) : []);
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

  // Where saving leads. Registration: the page after this one on the user's path (see pageAfter), not the furthest step
  // they ever reached. Account: back to the account page, after the public page's saved copy is thrown away (also the one
  // under the old address, if the address was changed: that link stops working, see the hint under the address box).
  async function goToNextPage() {
    if (account) {
      await refreshMyPublicPage(savedSlug && savedSlug !== values.slug ? savedSlug : undefined);
      router.push("/account");
      leaving.current = true;
      return;
    }
    router.push(pageAfter(await getOnboardingState(), "business_profile"));
    leaving.current = true;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    if (shrinking) {
      saveWhenShrunk.current = true; // see saveWhenShrunk
      return;
    }
    const form = e.currentTarget;
    setSubmitted(true);
    setError(null);

    // Send the cursor to the first field that needs fixing. A name we already know is taken counts too.
    const first = invalidFields(values, !!profile?.logo, categories, account)[0] ?? (slugTaken ? "slug" : undefined);
    if (first) {
      (form.elements.namedItem(CONTROL_NAME[first]) as HTMLElement | null)?.focus();
      return;
    }

    inFlight.current = true;
    setSending(true);
    try {
      try {
        await (editing ? updateProfile(values, setUpload) : createProfile(values, setUpload));
      } finally {
        setUpload(null);
        if (account) forgetOwnerProfile(); // what the account pages remembered of the profile is out of date, even if this half worked
      }
      await goToNextPage();
    } catch (err) {
      await handleError(err, form);
    } finally {
      if (!leaving.current) {
        inFlight.current = false;
        setSending(false);
      }
    }
  }

  async function handleError(err: unknown, form: HTMLFormElement) {
    if (!(err instanceof ApiError)) return setError(GENERIC_ERROR); // no connection, or the site can't reach the API
    const text = err.messages.join(". ");
    if (err.status === 409 && /company url/i.test(text)) {
      setSlugCheck({ slug: values.slug, state: "taken" }); // someone took it after the check above, or it was never checked
      (form.elements.namedItem("slug") as HTMLElement | null)?.focus();
    } else if (err.status === 409 && !account) {
      // The profile was already saved (a double click, or another tab): carry on with the saved one.
      try {
        await goToNextPage();
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
      <PageHeading title={account ? "Business profile" : "Public profile"} />

      {/* relative: PendingOverlay (absolute) floats over the form while `pending`. `inert` on the form itself
          (not just a visual dimming) is what actually stops it being typed into or submitted meanwhile. */}
      <div className="relative w-full">
        {/* noValidate: we draw our own red underline instead of the browser's pop-up messages. */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          noValidate
          inert={!!pending}
          className={`flex w-full flex-col items-center transition-opacity duration-200 ${pending ? "opacity-40" : ""}`}
        >
          <div className="flex w-full max-w-135 flex-col gap-5 px-5 pb-17.5 md:pb-8">
            <Field
              label="Company name*"
              name="companyName"
              type="text"
              autoComplete="organization"
              hint={`This will be displayed next to your company logo (up to ${COMPANY_NAME_MAX_LENGTH} characters).`}
              maxLength={COMPANY_NAME_MAX_LENGTH}
              value={values.companyName}
              onChange={(v) => set({ companyName: v })}
              invalid={invalid("companyName")}
            />
            <CategorySelect
              label="Business category*"
              placeholder="Select business category"
              options={categories.map((c) => ({ value: c.id, text: c.name, group: c.group, keywords: c.keywords }))}
              smallPlaceholder
              // No design for this line yet. It only shows once something is typed, and picks the "Other" category.
              fallback={categories.some((k) => k.id === "other") ? { value: "other", text: "Can't find yours? Choose \"Other\"" } : undefined}
              className="max-w-62.5"
              value={values.category}
              invalid={invalid("category")}
              onChange={(v) => set({ category: v })}
            />
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
            {/* Only when the owner edits the profile: during registration the last page asks for this text. Not in a design. */}
            {account && (
              <div className="flex w-full flex-col gap-2.25">
                <label htmlFor="about" className="text-[14px] font-semibold">
                  About*
                </label>
                <textarea
                  id="about"
                  name="about"
                  aria-invalid={invalid("about")}
                  aria-describedby="about-hint"
                  value={values.about}
                  onChange={(e) => set({ about: e.target.value })}
                  className={`h-75 w-full resize-none border p-1 text-[16px] text-[#111] outline-none focus:shadow-[0_0_0_1px_black] ${
                    invalid("about") ? "border-red-600 focus:shadow-[0_0_0_1px_#dc2626]" : "border-black"
                  }`}
                />
                <p id="about-hint" className="text-[13px] font-medium text-[#4b5563]">
                  Shown on your public About page. An empty line starts a new paragraph.
                </p>
              </div>
            )}
            <Field
              label="Your URL*"
              name="slug"
              type="text"
              prefix={`${SITE_HOST}/`}
              maxLength={50}
              hint={account ? "Changing it stops your old address from working." : undefined}
              value={values.slug}
              onChange={(v) => set({ slug: cleanSlug(v) })} // only lowercase letters, digits and dashes can be typed
              onBlur={checkSlug}
              invalid={invalid("slug")}
              // The answer shows at the end of the line: a spinner while we ask, then the check mark. Only the
              // "taken" sentence goes below the line, where there is room to read it.
              trailing={
                slugState === "checking" ? (
                  <>
                    {/* The gray ring stays put and the black arc turns, so it still reads as "working" with reduced motion. */}
                    <svg aria-hidden viewBox="0 0 20 20" className="size-5 shrink-0 animate-spin motion-reduce:animate-none" fill="none" strokeWidth="2.5">
                      <circle cx="10" cy="10" r="7.5" stroke="#d1d5db" />
                      <path d="M10 2.5a7.5 7.5 0 0 1 7.5 7.5" stroke="black" strokeLinecap="round" />
                    </svg>
                    <span role="status" className="sr-only">
                      Checking if this address is available
                    </span>
                  </>
                ) : slugState === "available" ? (
                  <>
                    <svg aria-hidden viewBox="0 0 20 20" className="size-5 shrink-0" fill="none" stroke="#009a1c" strokeWidth="2.5">
                      <path d="M4.5 10.5l3.5 3.5L15.5 6" />
                    </svg>
                    <span role="status" className="sr-only">
                      This address is available
                    </span>
                  </>
                ) : null
              }
              message={
                slugTaken ? (
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
              {/* Not in a design. What really happens (see the API notes): nothing is deleted, it is only hidden. */}
              {account && (
                <p className="text-[13px] font-medium text-[#4b5563]">
                  If you untick one, its items are hidden from your public page. Nothing is deleted, and ticking it again brings them back.
                </p>
              )}
            </div>

            <LogoPicker
              file={values.logo}
              saved={profile?.logo ?? null}
              invalid={invalid("logo")}
              problem={logoIssue}
              onPick={pickLogo}
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="flex cursor-pointer items-center gap-1 bg-black px-17.25 py-2.75 font-bold text-white disabled:cursor-wait disabled:opacity-60"
          >
            {account ? (
              "Save changes"
            ) : (
              <>
                Next
                <ArrowIcon className="h-3.5 w-3 translate-y-px" />
              </>
            )}
          </button>

          {/* While the logo goes up: how far it is (not in the design). */}
          {upload && (
            <div className="w-full max-w-135 px-5 pt-5">
              <UploadProgress status={upload} what="logo" />
            </div>
          )}

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
