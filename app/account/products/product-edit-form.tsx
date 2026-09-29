"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import BigLogo from "@/app/components/big-logo";
import PendingOverlay from "@/app/components/pending-overlay";
import ProductFields, { CONTROL_NAME } from "@/app/components/product-fields";
import { ApiError } from "@/lib/api";
import { GENERIC_ERROR } from "@/lib/auth-messages";
import { forgetOwnerProducts } from "@/lib/memory-cache";
import { refreshMyPublicPage } from "@/lib/onboarding";
import { useAfterDelay } from "@/lib/use-after-delay";
import {
  createProduct,
  deleteProduct,
  emptyProduct,
  invalidProductFields,
  saveProductEdits,
  valuesFromProduct,
  type MyProduct,
  type ProductField,
  type ProductValues,
} from "@/lib/products";

const LIST_PATH = "/account/products";

// The owner's "Edit product" page (and "Add product" when `product` is null): the registration page's fields, filled
// with the saved product. Saving sends only what changed (see saveProductEdits) and then makes the site forget its
// saved copy of the public page, so the change shows there at once. Deleting asks first.
// `editing` says which page this is right away (from the address), so the title doesn't change once the product has loaded.
// `pending`, set by the step while it doesn't yet know the product or the category list: the form is shown anyway
// (empty), under a PendingOverlay, and marked `inert` so it can't be used before that is known.
// `onOutOfSync`: saving is several requests and can fail half way; the step then loads the product again and this form
// shows what really is saved.
export default function ProductEditForm({
  editing,
  product,
  categories: knownCategories,
  pending,
  onRetry,
  onOutOfSync,
}: {
  editing: boolean; // "Edit product" or "Add product": known from the address, before the product itself has loaded
  product: MyProduct | null;
  categories: string[];
  pending?: "loading" | "error";
  onRetry: () => void;
  onOutOfSync: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProductValues>(() => (product ? valuesFromProduct(product) : emptyProduct));
  // The saved product was loaded again (after a failed save): show it instead of what was half saved.
  const [shown, setShown] = useState(product);
  if (product !== shown) {
    setShown(product);
    setValues(product ? valuesFromProduct(product) : emptyProduct);
  }
  const categories = knownCategories; // the page is left after saving, so a new category needn't be added to the list

  // Red lines stay hidden until the user tries to save once. After that they update as the user types.
  const [submitted, setSubmitted] = useState(false);
  const [phase, setPhase] = useState<"idle" | "saving" | "deleting">("idle");
  const inFlight = useRef(false); // the real "already working" guard: state would be stale for a second click in the same instant
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const busy = phase !== "idle";
  // Blocked (inert) at once, but only looks dimmed, with the "Loading" box, if it takes a moment (an error shows at once).
  const showPending = useAfterDelay(pending === "loading", 200) || pending === "error";

  const bad =new Set(submitted ? invalidProductFields(values) : []);
  const invalid = (field: ProductField) => bad.has(field);

  function showError(err: unknown) {
    if (!(err instanceof ApiError)) return setError(GENERIC_ERROR); // no connection, or the site can't reach the API
    if (err.status === 413) setError("A photo is larger than 10 MB.");
    else if (err.status === 502) setError("We couldn't upload the photos. Please try again.");
    else if (err.status === 400) setError(err.messages.join(". ") || GENERIC_ERROR); // a rule the form didn't catch
    else if (err.status === 404) setError("This product no longer exists.");
    else setError(GENERIC_ERROR);
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
        if (product) await saveProductEdits(product, values);
        else await createProduct(values);
      } finally {
        forgetOwnerProducts(); // what the list and the product pages remembered is out of date, even if this only half worked
      }
      await refreshMyPublicPage();
      router.push(LIST_PATH);
      return;
    } catch (err) {
      showError(err);
      if (product) {
        setError((message) => `${message ?? GENERIC_ERROR} Some of your changes may have been saved: the form now shows what is saved.`);
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
      <h1 className="pt-9.5 pb-10 text-[20px] font-semibold md:pt-6 md:pb-6">{editing ? "Edit product" : "Add product"}</h1>

      {/* relative: PendingOverlay (absolute) floats over the form while `pending`. `inert` on the form itself
          (not just a visual dimming) is what actually stops it being typed into or submitted meanwhile. */}
      <div className="relative w-full">
        {/* noValidate: we draw our own red underline instead of the browser's pop-up messages. */}
        <form
          onSubmit={handleSubmit}
          noValidate
          inert={!!pending}
          className={`flex w-full flex-col items-center transition-opacity duration-200 ${showPending ? "opacity-40" : ""}`}
        >
          <div className="flex w-full max-w-135 flex-col gap-5 px-5 pb-10 md:pb-8">
            <ProductFields values={values} onChange={setValues} invalid={invalid} categories={categories} />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="flex cursor-pointer items-center gap-1 bg-black px-17.25 py-2.75 font-bold text-white disabled:cursor-wait disabled:opacity-60"
          >
            {editing ? "Save changes" : "Add product"}
          </button>

          {/* Not in a design: messages under the button, in the same place as on the registration pages. */}
          <div className="min-h-9 w-full max-w-135 px-5 pt-3 text-center">
            {phase === "saving" && (
              <p role="status" className="text-[13px] font-medium text-[#4b5563]">
                {editing ? "Saving your changes. This can take a moment." : "Uploading your product. This can take a moment."}
              </p>
            )}
            {error && (
              <p role="alert" className="text-[14px] text-red-600">
                {error}
              </p>
            )}
          </div>

          {editing && (
            <div className="flex w-full max-w-135 flex-col items-center gap-3 px-5 pt-2 pb-10 md:pb-8">
              {confirmingDelete ? (
                <>
                  <p className="text-center text-[14px]">Delete this product and its photos? This can&apos;t be undone.</p>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={busy}
                      className="flex h-11 cursor-pointer items-center justify-center border-2 border-red-600 px-5 text-[14px] font-bold text-red-600 disabled:cursor-wait disabled:opacity-60"
                    >
                      {phase === "deleting" ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={busy}
                      className="flex h-11 cursor-pointer items-center justify-center border-2 border-black px-5 text-[14px] font-bold disabled:cursor-wait disabled:opacity-60"
                    >
                      Cancel
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
                  Delete product
                </button>
              )}
            </div>
          )}
        </form>
        {pending && showPending && <PendingOverlay state={pending} onRetry={onRetry} />}
      </div>
    </>
  );
}
