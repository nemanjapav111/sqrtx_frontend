"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import BigLogo from "@/app/components/big-logo";
import Loading from "@/app/components/loading";
import { GENERIC_ERROR } from "@/lib/auth-messages";
import { getBillingPlans, getBillingStatus, type BillingPlans, type BillingStatus } from "@/lib/billing";
import { getOnboardingState, pathForStep } from "@/lib/onboarding";
import { supabase } from "@/lib/supabase";
import { useRequireSession } from "@/lib/use-session";
import BillingSection from "./billing-section";

type Load =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; email: string; billing: BillingStatus; plans: BillingPlans };

// Loads what the page shows, or sends the visitor away if they don't belong here (not logged in, or registration
// not finished yet). `returned` is what the payment provider brought the user back with, if anything.
export default function AccountStep({ returned }: { returned: "success" | "cancelled" | null }) {
  const router = useRouter();
  const session = useRequireSession();
  const [attempt, setAttempt] = useState(0); // "Try again" runs the loading again
  const [load, setLoad] = useState<Load>({ status: "loading" });

  useEffect(() => {
    if (session !== "signed-in") return;
    let cancelled = false;
    (async () => {
      try {
        const state = await getOnboardingState();
        if (state.step !== "done") return router.replace(pathForStep(state.step)); // registration is not finished
        const [billing, plans, auth] = await Promise.all([getBillingStatus(), getBillingPlans(), supabase.auth.getSession()]);
        if (!cancelled) setLoad({ status: "ready", email: auth.data.session?.user.email ?? "", billing, plans });
      } catch {
        if (!cancelled) setLoad({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, attempt, router]);

  // Asks the API again where the account is (after a payment, or when a subscription changed under the user).
  const refreshBilling = useCallback(async () => {
    const billing = await getBillingStatus();
    setLoad((now) => (now.status === "ready" ? { ...now, billing } : now));
  }, []);

  return (
    <>
      <BigLogo />
      <h1 className="pt-9.5 pb-10 text-[20px] font-semibold md:pt-6 md:pb-6">Account</h1>

      {load.status === "loading" && <Loading />}

      {load.status === "error" && (
        <div className="flex flex-col items-center gap-4 px-5 text-center">
          <p role="alert" className="text-red-600">
            {GENERIC_ERROR}
          </p>
          <button
            type="button"
            onClick={() => {
              setLoad({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
            className="h-11 w-46.5 cursor-pointer border-2 border-black bg-white font-bold"
          >
            Try again
          </button>
        </div>
      )}

      {load.status === "ready" && (
        <div className="flex w-full max-w-135 flex-col gap-10 px-5 pb-10 md:pb-6">
          <section className="flex flex-col gap-2">
            <h2 className="text-[16px] font-semibold">Login</h2>
            <p className="text-[14px]">
              <span className="text-[#4b5563]">Email: </span>
              {load.email}
            </p>
            {/* h-11: a 44px tap area, like the other links and buttons on phone-size pages. */}
            <Link href="/account/settings" className="flex h-11 items-center self-start text-[14px] font-semibold underline">
              Change login email or password
            </Link>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[16px] font-semibold">Your business page</h2>
            <p className="text-[14px]">
              {load.billing.has_access
                ? "Your business page is public."
                : "Your business page is hidden from the public. Your information is safe, and it becomes public again when you subscribe."}
            </p>
          </section>

          <BillingSection billing={load.billing} plans={load.plans} returned={returned} onRefresh={refreshBilling} />
        </div>
      )}
    </>
  );
}
