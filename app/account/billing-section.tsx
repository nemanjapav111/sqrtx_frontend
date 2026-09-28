"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { GENERIC_ERROR } from "@/lib/auth-messages";
import {
  formatDate,
  formatMoney,
  goToProvider,
  openBillingPortal,
  startCheckout,
  yearlySavingCents,
  type BillingPlans,
  type BillingStatus,
  type PlanId,
} from "@/lib/billing";

const POLL_EVERY_MS = 3000;
const POLLS = 20; // about a minute: a payment is confirmed by the provider's notification, which normally takes seconds

const PRIMARY = "flex h-11 w-full cursor-pointer items-center justify-center bg-black font-bold text-white disabled:cursor-wait disabled:opacity-60";
const SECONDARY =
  "flex h-11 w-full cursor-pointer items-center justify-center border-2 border-black bg-white font-bold disabled:cursor-wait disabled:opacity-60";

// The billing part of the account page: where the free trial or subscription stands, the plans to choose from, and the
// way to manage a subscription. Paying happens on the payment provider's own page (the browser is sent there): card
// details never reach us. There is no design for it yet, so all wording is placeholder.
export default function BillingSection({
  billing,
  plans,
  returned,
  onRefresh,
}: {
  billing: BillingStatus;
  plans: BillingPlans;
  returned: "success" | "cancelled" | null;
  onRefresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<PlanId | "portal" | null>(null);
  const inFlight = useRef(false); // the real "already working" guard: state would be stale for a second click in the same instant
  const [error, setError] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false); // still waiting for the payment to show up after about a minute

  const paid = billing.status === "active" || billing.status === "past_due";
  const inTrial = billing.status === "trialing" && billing.has_access;
  // The free trial is over (a trial that ran out but is not yet marked expired counts too).
  const trialOver = billing.status === "expired" || (billing.status === "trialing" && !billing.has_access);
  const showPlans = inTrial || trialOver;

  // Back from the payment page: the subscription only changes when the provider's notification reaches our server,
  // which can be a few seconds after the user is back. Ask again until it shows, and give up after about a minute.
  const waiting = returned === "success" && billing.status !== "active";
  useEffect(() => {
    if (!waiting) return;
    let left = POLLS;
    const timer = setInterval(() => {
      if (left-- <= 0) {
        clearInterval(timer);
        setGaveUp(true);
        return;
      }
      onRefresh().catch(() => {}); // a failed check is simply tried again at the next tick
    }, POLL_EVERY_MS);
    return () => clearInterval(timer);
  }, [waiting, onRefresh]);

  function messageFor(err: unknown) {
    if (err instanceof ApiError && err.status === 503) return "Payments are not available yet. Please try again later.";
    if (err instanceof ApiError && err.status === 409) return err.messages.join(". ") || GENERIC_ERROR;
    return GENERIC_ERROR;
  }

  // Runs one of the two "go to the payment provider" actions. On success the browser leaves the page, so the button
  // stays greyed out until then.
  async function goTo(action: PlanId | "portal") {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(action);
    setError(null);
    try {
      const { url } = await (action === "portal" ? openBillingPortal() : startCheckout(action));
      if (goToProvider(url)) return;
      setError(GENERIC_ERROR);
    } catch (err) {
      setError(messageFor(err));
      if (err instanceof ApiError && err.status === 409) onRefresh().catch(() => {}); // it changed under the user: show how it really is
    }
    inFlight.current = false;
    setBusy(null);
  }

  const saving = yearlySavingCents(plans.plans);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[16px] font-semibold">Billing</h2>

      {returned === "success" && billing.status === "active" && (
        <p role="status" className="text-[14px] font-semibold">
          Thank you! Your subscription is active.
        </p>
      )}
      {waiting && (
        <p role="status" className="text-[14px] font-semibold">
          {gaveUp
            ? "This is taking longer than usual. Your payment will show here as soon as it is confirmed. You can come back to this page later."
            : "Thank you! We are confirming your payment. This usually takes a few seconds."}
        </p>
      )}
      {returned === "cancelled" && !paid && <p className="text-[14px] font-semibold">Checkout was cancelled. You have not been charged.</p>}

      {inTrial && (
        <p className="text-[14px]">
          <strong>Free trial:</strong>{" "}
          {billing.trial_days_left === 0
            ? "it ends today."
            : `${billing.trial_days_left} ${billing.trial_days_left === 1 ? "day" : "days"} left${
                billing.trial_ends_at ? `, until ${formatDate(billing.trial_ends_at)}` : ""
              }.`}{" "}
          Your business page is public during the trial. No card is needed until you subscribe.
        </p>
      )}
      {trialOver && (
        <p className="text-[14px]">
          <strong>Your free trial has ended.</strong> Choose a plan to make your business page public again.
        </p>
      )}

      {paid && (
        <div className="flex flex-col gap-3">
          <p className="text-[14px]">
            {billing.status === "past_due" ? (
              <>
                <strong>We could not take your last payment.</strong> Update your payment method to keep your business page
                public.
              </>
            ) : (
              <>
                <strong>You are subscribed</strong>
                {billing.plan ? ` to the ${billing.plan} plan` : ""}.{" "}
                {billing.current_period_end &&
                  (billing.cancel_at_period_end
                    ? `Your subscription is cancelled. Your business page stays public until ${formatDate(billing.current_period_end)}.`
                    : `It renews on ${formatDate(billing.current_period_end)}.`)}
              </>
            )}
          </p>
          <button type="button" onClick={() => goTo("portal")} disabled={busy !== null} className={SECONDARY}>
            {busy === "portal" ? "Opening…" : "Manage subscription"}
          </button>
        </div>
      )}

      {showPlans && (
        <div className="flex flex-col gap-4">
          {plans.plans.map((plan) => (
            <div key={plan.id} className="flex flex-col gap-3 border border-black p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[16px] font-semibold">{plan.name}</h3>
                <p className="text-[16px] font-semibold">
                  {formatMoney(plan.amount_cents, plan.currency)}
                  <span className="text-[14px] font-normal text-[#4b5563]"> / {plan.interval}</span>
                </p>
              </div>
              {plan.id === "yearly" && saving > 0 && (
                <p className="text-[14px] text-[#4b5563]">Save {formatMoney(saving, plan.currency)} a year compared with monthly.</p>
              )}
              <button type="button" onClick={() => goTo(plan.id)} disabled={busy !== null} className={PRIMARY}>
                {busy === plan.id ? "Opening payment page…" : "Subscribe"}
              </button>
            </div>
          ))}
          <p className="text-[14px] text-[#4b5563]">
            One subscription per account. You pay on our payment provider’s page: we never see your card details.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-[14px] text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
