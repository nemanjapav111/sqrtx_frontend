import { GENERIC_ERROR } from "@/lib/auth-messages";
import Loading from "./loading";

// Floats on top of a form while the page's own data (an existing profile, the category list, ...) is still loading
// or failed to load. The form underneath is shown at once, empty, so the page is never blank; its parent marks it
// `inert` while this is up, so nothing can be typed or submitted before the real data is known. This container has
// no background of its own, so the (inert) form stays visible behind it; only the two states here have one, like
// small cards floating in front of it.
export default function PendingOverlay({ state, onRetry }: { state: "loading" | "error"; onRetry: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center">
      {state === "loading" ? (
        <Loading />
      ) : (
        <div className="flex flex-col items-center gap-4 bg-white px-6 py-5 text-center">
          <p role="alert" className="text-red-600">
            {GENERIC_ERROR}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="w-46.5 cursor-pointer border-2 border-black bg-white py-2.25 font-bold"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
