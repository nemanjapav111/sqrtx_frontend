"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import BigLogo from "@/app/[lang]/components/big-logo";
import { useCommonText } from "@/app/[lang]/components/lang-context";
import VisibilityToggle from "@/app/[lang]/components/visibility-toggle";
import type { Dictionary } from "@/app/[lang]/dictionaries/en";
import PendingOverlay from "@/app/[lang]/components/pending-overlay";
import UploadProgress from "@/app/[lang]/components/upload-progress";
import ProductFields, { CONTROL_NAME } from "@/app/[lang]/components/product-fields";
import { ApiError } from "@/lib/api";
import { forgetOwnerProducts } from "@/lib/memory-cache";
import { refreshMyPublicPage } from "@/lib/onboarding";
import { isSaved } from "@/lib/photos";
import {
  createProduct,
  deleteProduct,
  emptyProduct,
  invalidProductFields,
  saveProductEdits,
  setProductActive,
  valuesFromProduct,
  type MyProduct,
  type ProductField,
  type ProductValues,
} from "@/lib/products";
import type { UploadStatus } from "@/lib/upload";

const LIST_PATH = "/account/products";

// The owner's "Edit product" page (and "Add product" when `product` is null): the registration page's fields, filled
// with the saved product. Saving sends only what changed (see saveProductEdits) and then makes the site forget its
// saved copy of the public page, so the change shows there at once. Deleting asks first.
// `editing` says which page this is right away (from the address), so the title doesn't change once the product has loaded.
// `pending`, set by the step while it doesn't yet know the product or the category list: the form is shown anyway
// (empty) and marked `inert` so it can't be used before that is known. While it loads it is dimmed under the loading spinner box
// (PendingOverlay), however long it takes; a failure shows the error box with "Try again" in the same place.
// `onOutOfSync`: saving is several requests and can fail half way; the step then loads the product again and this form
// shows what really is saved.
export default function ProductEditForm({
  text,
  editing,
  product,
  categories: knownCategories,
  currency,
  pending,
  onRetry,
  onOutOfSync,
}: {
  text: Dictionary["account"]["products"]["edit"];
  editing: boolean; // "Edit product" or "Add product": known from the address, before the product itself has loaded
  product: MyProduct | null;
  categories: string[];
  currency: string; // the business's currency, for the price box
  pending?: "loading" | "error";
  onRetry: () => void;
  onOutOfSync: () => void;
}) {
  const router = useRouter();
  const common = useCommonText();
  const [active, setActive] = useState(product?.is_active !== false); // whether the public can see it (saved at once by the toggle, not with the form)
  const [values, setValues] = useState<ProductValues>(() => (product ? valuesFromProduct(product) : emptyProduct));
  // The saved product was loaded again (after a failed save): show it instead of what was half saved.
  const [shown, setShown] = useState(product);
  if (product !== shown) {
    setShown(product);
    setActive(product?.is_active !== false);
    setValues(product ? valuesFromProduct(product) : emptyProduct);
  }
  const categories = knownCategories; // the page is left after saving, so a new category needn't be added to the list

  // Red lines stay hidden until the user tries to save once. After that they update as the user types.
  const [submitted, setSubmitted] = useState(false);
  const [phase, setPhase] = useState<"idle" | "saving" | "deleting">("idle");
  const inFlight = useRef(false); // the real "already working" guard: state would be stale for a second click in the same instant
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [upload, setUpload] = useState<UploadStatus | null>(null); // how the photos' upload is going, while saving
  const busy = phase !== "idle";

  const bad =new Set(submitted ? invalidProductFields(values) : []);
  const invalid = (field: ProductField) => bad.has(field);

  function showError(err: unknown) {
    if (!(err instanceof ApiError)) return setError(common.genericError); // no connection, or the site can't reach the API
    if (err.status === 403) setError(common.subscriptionEnded); // the free trial or subscription has ended: editing is closed
    else if (err.status === 413) setError(text.photoTooBig);
    else if (err.status === 502) setError(text.photosUploadFailed);
    else if (err.status === 400) setError(err.messages.join(". ") || common.genericError); // a rule the form didn't catch
    else if (err.status === 404) setError(text.noLonger);
    else setError(common.genericError);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    const form = e.currentTarget;
    setSubmitted(true);
    setError(null);

    // Send the cursor to the first field that needs fixing.
    const first = invalidProductFields(values)[0];
    if (first) return void (form.elements.namedItem(CONTROL_NAME[first]) as HTMLElement | null)?.focus();

    inFlight.current = true;
    setPhase("saving");
    try {
      try {
        if (product) await saveProductEdits(product, values, setUpload);
        else await createProduct(values, setUpload);
      } finally {
        setUpload(null);
        forgetOwnerProducts(); // what the list and the product pages remembered is out of date, even if this only half worked
      }
      await refreshMyPublicPage();
      router.push(LIST_PATH);
      return;
    } catch (err) {
      showError(err);
      if (product && !(err instanceof ApiError && err.status === 403)) { // a 403 means nothing was changed (editing is closed): no "some changes may be saved"
        setError((message) => `${message ?? common.genericError} ${text.partial}`);
        onOutOfSync();
      }
    }
    inFlight.current = false;
    setPhase("idle");
  }

  async function handleDelete() {
    if (!product || inFlight.current) return;
    inFlight.current = true;
    setPhase("deleting");
    setError(null);
    try {
      try {
        await deleteProduct(product.id);
      } finally {
        forgetOwnerProducts();
      }
      await refreshMyPublicPage();
      router.push(LIST_PATH);
      return;
    } catch (err) {
      showError(err);
    }
    inFlight.current = false;
    setPhase("idle");
    setConfirmingDelete(false);
  }

  return (
    <>
      <BigLogo />
      <h1 className="pt-9.5 pb-10 text-[26px] leading-[1.2] font-bold md:pt-6 md:pb-6">{editing ? text.titleEdit : text.titleNew}</h1>

      {/* relative: PendingOverlay (absolute) floats over the form while `pending`. `inert` on the form itself
          (not just a visual dimming) is what actually stops it being typed into or submitted meanwhile. */}
      <div className="relative w-full">
        {/* noValidate: we draw our own red underline instead of the browser's pop-up messages. */}
        <form
          onSubmit={handleSubmit}
          noValidate
          inert={!!pending}
          className={`flex w-full flex-col items-center transition-opacity duration-200 ${pending ? "opacity-40" : ""}`}
        >
          <div className="flex w-full max-w-135 flex-col gap-5 px-5 pb-10 md:pb-8">
            <ProductFields values={values} onChange={setValues} invalid={invalid} categories={categories} currency={currency} />
          </div>

          <div className="w-full max-w-135 px-5">
            <button
              type="submit"
              disabled={busy}
              className="flex w-full cursor-pointer items-center justify-center bg-black py-3.5 font-bold text-white disabled:cursor-wait disabled:opacity-60"
            >
              {editing ? text.save : text.add}
            </button>
          </div>

          {/* Not in a design: messages under the button, in the same place as on the registration pages. */}
          <div className="min-h-9 w-full max-w-135 px-5 pt-3 text-center">
            {phase === "saving" &&
              (upload ? (
                <UploadProgress status={upload} what="photo" count={values.images.filter((image) => !isSaved(image)).length} />
              ) : (
                <p role="status" className="text-[13px] font-medium text-[#4b5563]">
                  {editing ? text.saving : text.uploading}
                </p>
              ))}
            {error && (
              <p role="alert" className="text-[14px] text-red-600">
                {error}
              </p>
            )}
          </div>

          {product && (
            <VisibilityToggle
              text={text.visibility}
              active={active}
              onChange={async (next) => {
                await setProductActive(product.id, next);
                setActive(next);
                forgetOwnerProducts();
                await refreshMyPublicPage();
              }}
            />
          )}

          {editing && (
            <div className="flex w-full max-w-135 flex-col items-center gap-3 px-5 pt-2 pb-10 md:pb-8">
              {confirmingDelete ? (
                <>
                  <p className="text-center text-[14px]">{text.confirm}</p>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={busy}
                      className="flex h-11 cursor-pointer items-center justify-center border-2 border-red-600 px-5 text-[14px] font-bold text-red-600 disabled:cursor-wait disabled:opacity-60"
                    >
                      {phase === "deleting" ? text.deleting : text.yesDelete}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={busy}
                      className="flex h-11 cursor-pointer items-center justify-center border-2 border-black px-5 text-[14px] font-bold disabled:cursor-wait disabled:opacity-60"
                    >
                      {text.cancel}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  disabled={busy}
                  className="flex h-11 cursor-pointer items-center px-3 text-[14px] font-semibold text-red-600 underline disabled:cursor-wait disabled:opacity-60"
                >
                  {text.delete}
                </button>
              )}
            </div>
          )}
        </form>
        {pending && <PendingOverlay state={pending} onRetry={onRetry} />}
      </div>
    </>
  );
}
