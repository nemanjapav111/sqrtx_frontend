"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import BigLogo from "@/app/components/big-logo";
import PendingOverlay from "@/app/components/pending-overlay";
import { getBootstrap } from "@/lib/bootstrap";
import { getBillingPlans, getBillingStatus, type BillingPlans, type BillingStatus } from "@/lib/billing";
import { slugFromUrl } from "@/lib/business-profile";
import { recall, remember } from "@/lib/memory-cache";
import { pathForStep } from "@/lib/onboarding";
import { supabase } from "@/lib/supabase";
import { useRequireSession } from "@/lib/use-session";
import BillingSection from "./billing-section";

type Ready = { status: "ready"; email: string; billing: BillingStatus; plans: BillingPlans; slug: string; offersProducts: boolean };
type Load = { status: "loading" } | { status: "error" } | Ready;

// What was on the page last time (see lib/memory-cache.ts): shown at once when the page is opened again, while the API is asked
// again behind the scenes, instead of dimming the page under "Loading" for data that was on screen a moment ago.
const CACHE_KEY = "owner:account";

// Grey placeholder shapes for the parts of the page whose real content depends on the billing/profile data: unlike a
// form's blank fields (always the same shape), whether these show any text or button at all depends on that data, so
// there's nothing truthful to render in their place until it's known. Reserves roughly the space the real content
// will take instead, so as little as possible shifts once it arrives. While the page loads they are its ONLY loading
// indicator (no spinner and no dimming, however long it takes): they breathe (see `breathe` in globals.css), and stand
// still if loading failed (`breathing` false), where the error box says so.
function TextSkeleton({ breathing }: { breathing: boolean }) {
  return (
    <div aria-hidden className={`flex flex-col gap-1.5 ${breathing ? "breathe" : ""}`}>
      <div className="h-3.5 w-full max-w-100 rounded-sm bg-[#e5e7eb]" />
      <div className="h-3.5 w-2/3 max-w-60 rounded-sm bg-[#e5e7eb]" />
    </div>
  );
}
function ButtonSkeleton({ breathing }: { breathing: boolean }) {
  return <div aria-hidden className={`h-11 w-full bg-[#e5e7eb] ${breathing ? "breathe" : ""}`} />;
}

// Loads what the page shows, or sends the visitor away if they don't belong here (not logged in, or registration
// not finished yet). The first HTML of the page (built once, see page.tsx) is this loading state, grey placeholders included, so
// nothing but a logo is ever on screen while the browser's code loads.
export default function AccountStep() {
  const router = useRouter();
  const session = useRequireSession();
  const [attempt, setAttempt] = useState(0); // "Try again" runs the loading again
  const [load, setLoad] = useState<Load>(() => recall<Ready>(CACHE_KEY) ?? { status: "loading" });

  useEffect(() => {
    if (session !== "signed-in") return;
    let cancelled = false;
    (async () => {
      try {
        // The bootstrap (registration step, address and billing status in one request) and the plans are asked for at the same
        // time (see products/product-edit-step.tsx); the plans are the same for everyone.
        const extra = Promise.all([getBillingPlans(), supabase.auth.getSession()]);
        extra.catch(() => undefined);
        const { onboarding, company_url, billing } = await getBootstrap();
        if (onboarding.step !== "done") return router.replace(pathForStep(onboarding.step)); // registration is not finished
        const [plans, auth] = await extra;
        const slug = company_url ? slugFromUrl(company_url) : "";
        const offersProducts = !!onboarding.provides && onboarding.provides !== "services";
        const ready: Ready = { status: "ready", email: auth.data.session?.user.email ?? "", billing, plans, slug, offersProducts };
        remember(CACHE_KEY, ready);
        if (!cancelled) setLoad(ready);
      } catch {
        // With something already on screen (from the last visit) a failed check is not worth an error box: it stays.
        if (!cancelled) setLoad((now) => (now.status === "ready" ? now : { status: "error" }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, attempt, router]);

  // Asks the API again where the account is (after a payment, or when a subscription changed under the user).
  const refreshBilling = useCallback(async () => {
    const billing = await getBillingStatus();
    setLoad((now) => {
      if (now.status !== "ready") return now;
      const next = { ...now, billing };
      remember(CACHE_KEY, next);
      return next;
    });
  }, []);

  const [loggingOut, setLoggingOut] = useState(false);
  async function logOut() {
    setLoggingOut(true);
    await supabase.auth.signOut({ scope: "local" });
    router.push("/login");
  }

  const pending = load.status === "ready" ? undefined : load.status;
  // While it loads the page is blocked (inert) and shows grey placeholders that breathe: never a spinner or a dimming, however
  // long it takes. Only a failure dims it and says so (with "Try again").
  const loading = pending === "loading";
  const failed = pending === "error";

  return (
    <>
      <BigLogo />
      <h1 className="pt-9.5 pb-10 text-[20px] font-semibold md:pt-6 md:pb-6">Account</h1>

      {/* relative: PendingOverlay (absolute) floats over this if loading failed. `inert` on the content itself keeps
          it from being read by a screen reader or focused into while it's just a placeholder underneath. */}
      <div className="relative flex w-full max-w-135 flex-col">
        <div
          inert={!!pending}
          className={`flex w-full flex-col gap-10 px-5 pb-10 transition-opacity duration-200 md:pb-6 ${failed ? "opacity-40" : ""}`}
        >
          <section className="flex flex-col gap-2">
            <h2 className="text-[16px] font-semibold">Login</h2>
            <p className="text-[14px]">
              <span className="text-[#4b5563]">Email: </span>
              {load.status === "ready" ? (
                load.email
              ) : (
                <span aria-hidden className={`inline-block h-3.5 w-44 rounded-sm bg-[#e5e7eb] align-middle ${loading ? "breathe" : ""}`} />
              )}
            </p>
            {/* h-11: a 44px tap area, like the other links and buttons on phone-size pages. */}
            <Link href="/account/settings" className="flex h-11 items-center self-start text-[14px] font-semibold underline">
              Change login email or password
            </Link>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[16px] font-semibold">Your business page</h2>
            {load.status === "ready" ? (
              <>
                <p className="text-[14px]">
                  {load.billing.has_access
                    ? "Your business page is public."
                    : "Your business page is hidden from the public. Your information is safe, and it becomes public again when you subscribe."}
                </p>
                {/* Only when there is something to see: hidden from the public (trial over, not subscribed) or a
                    profile that failed to load would just land on a "not found" page. A real button, not a plain link
                    like "Change login email" above: for someone whose page is public this is likely the thing they came
                    here to do, so it gets the same weight as "Manage subscription" below, not a line of text next to it. */}
                {load.billing.has_access && load.slug && (
                  <Link
                    href={`/${load.slug}`}
                    className="flex h-11 w-full items-center justify-center border-2 border-black bg-white text-[14px] font-bold"
                  >
                    View my page
                  </Link>
                )}
                {/* The profile (name, address, contact, logo, ...) is editable whatever the billing state. */}
                <Link
                  href="/account/profile"
                  className="flex h-11 w-full items-center justify-center border-2 border-black bg-white text-[14px] font-bold"
                >
                  Edit business profile
                </Link>
              </>
            ) : (
              <>
                <TextSkeleton breathing={loading} />
                {/* Reserves the space for "View my page" (or, later, an "activate profile" button for a hidden
                    page): which one, or neither, depends on billing we don't have yet. */}
                <ButtonSkeleton breathing={loading} />
              </>
            )}
          </section>

          {/* Only when the business offers products, and only once that is known (a link that then disappears would
              move the page). No skeleton: whether it shows at all depends on the profile, so it just arrives. */}
          {load.status === "ready" && load.offersProducts && (
            <section className="flex flex-col gap-2">
              <h2 className="text-[16px] font-semibold">Products</h2>
              <Link
                href="/account/products"
                className="flex h-11 w-full items-center justify-center border-2 border-black bg-white text-[14px] font-bold"
              >
                Manage products
              </Link>
            </section>
          )}

          {load.status === "ready" ? (
            <BillingSection billing={load.billing} plans={load.plans} onRefresh={refreshBilling} />
          ) : (
            <section className="flex flex-col gap-4">
              <h2 className="text-[16px] font-semibold">Billing</h2>
              <TextSkeleton breathing={loading} />
              <ButtonSkeleton breathing={loading} />
            </section>
          )}

        </div>

        {failed && (
          <PendingOverlay
            state="error"
            onRetry={() => {
              setLoad({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
          />
        )}
      </div>

      {/* A terminal, whole-account action: last on the page rather than folded into "Login" above, so it doesn't
          interrupt the read before Billing. Outside the `inert` content so it still works when loading failed (the
          user can always leave); not drawn while loading, where it would just flash in. It is the last thing on the
          page, so it appearing later shifts nothing above it. */}
      {load.status !== "loading" && (
        <div className="w-full max-w-135 px-5 pb-10 md:pb-6">
          <button
            type="button"
            onClick={logOut}
            disabled={loggingOut}
            className="flex h-11 w-full cursor-pointer items-center justify-center border-2 border-black bg-white text-[14px] font-bold disabled:cursor-wait disabled:opacity-60"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      )}
    </>
  );
}
