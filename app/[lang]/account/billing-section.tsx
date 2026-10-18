"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCommonText, useLang } from "@/app/[lang]/components/lang-context";
import type { Dictionary } from "@/app/[lang]/dictionaries/en";
import { ApiError } from "@/lib/api";
import { PAYMENT_COMPLETED_EVENT, startPaymentMethodChange, startPlanCheckout } from "@/lib/paddle";
import { FORMAT_LOCALE, fill, plural } from "@/lib/i18n";
import {
  formatDate,
  formatMoney,
  cancelSubscription,
  changePlan,
  resumeSubscription,
  planWord,
  yearlySavingCents,
  type BillingPlans,
  type BillingStatus,
  type PlanId,
} from "@/lib/billing";

// A sentence that ends in a date: Serbian dates already end in a full stop ("14. novembra 2026."), so it is not added twice.
const endSentence = (sentence: string) => (sentence.endsWith(".") ? sentence : `${sentence}.`);

// What someone who already pays can do: change the card (an overlay on this page), cancel at the end of the paid period or take back a
// cancellation (both are calls to our API: nothing opens, the page just shows the new state).
type PortalAction = "payment" | "cancel" | "resume" | "switch";

const POLL_EVERY_MS = 3000;
const POLLS = 20; // about a minute: a payment is confirmed by the provider's notification, which normally takes seconds

const PRIMARY = "flex h-11 w-full cursor-pointer items-center justify-center bg-black font-bold text-white disabled:cursor-wait disabled:opacity-60";
const SECONDARY =
  "flex h-11 w-full cursor-pointer items-center justify-center border-2 border-black bg-white font-bold disabled:cursor-wait disabled:opacity-60";
// Cancelling is the one action here that takes something away, so it is red: outlined while it only asks, solid on the final "yes".
const DANGER_OUTLINE =
  "flex h-11 w-full cursor-pointer items-center justify-center border-2 border-red-600 bg-white font-bold text-red-600 disabled:cursor-wait disabled:opacity-60";
const DANGER = "flex h-11 w-full cursor-pointer items-center justify-center bg-red-600 font-bold text-white disabled:cursor-wait disabled:opacity-60";

// The billing part of the account page: where the free trial or subscription stands, the plans to choose from, and the
// way to manage a subscription. Paying happens on the payment provider's own page (the browser is sent there): card
// details never reach us. There is no design for it yet, so all wording is placeholder.
// `returned` is what the payment provider brought the user back with (?checkout=success or ?checkout=cancelled), if anything. It
// is read here, in the browser, because this part only exists once the data has arrived: the account page itself is built once
// and never reads the address (see account/page.tsx).
export default function BillingSection({
  text,
  title,
  billing,
  plans,
  onRefresh,
}: {
  text: Dictionary["account"]["billing"];
  title: string;
  billing: BillingStatus;
  plans: BillingPlans;
  onRefresh: () => Promise<void>;
}) {
  const lang = useLang();
  const common = useCommonText();
  const date = (iso: string) => formatDate(iso, FORMAT_LOCALE[lang]);
  const checkout = useSearchParams().get("checkout");
  // What the payment page brought the user back with, read once when this part appears and then taken out of the address: a page
  // reload (or an old bookmark) must not show "confirming your payment" for a payment that is not happening.
  const [returned] = useState<"success" | "cancelled" | null>(checkout === "success" || checkout === "cancelled" ? checkout : null);
  useEffect(() => {
    if (checkout) window.history.replaceState(null, "", window.location.pathname);
  }, [checkout]);
  const [busy, setBusy] = useState<PlanId | PortalAction | null>(null);
  const inFlight = useRef(false); // the real "already working" guard: state would be stale for a second click in the same instant
  const [error, setError] = useState<string | null>(null);
  const [confirmingSwitch, setConfirmingSwitch] = useState(false); // "Switch to the other plan" was pressed: waiting for the yes
  const [confirmingCancel, setConfirmingCancel] = useState(false); // "Cancel subscription" was pressed: waiting for the yes
  const [gaveUp, setGaveUp] = useState(false); // still waiting for the payment to show up after about a minute

  const paid = billing.status === "active" || billing.status === "past_due";
  const inTrial = billing.status === "trialing" && billing.has_access;
  // The free trial is over (a trial that ran out but is not yet marked expired counts too).
  const trialOver = billing.status === "expired" || (billing.status === "trialing" && !billing.has_access);
  const choosingPlan = inTrial || trialOver; // the plans are on offer (no subscription yet)
  // A payment went through in the overlay, whether or not the user has closed it: from then on the page says "confirming" instead of still offering the plans.
  const [paidNow, setPaidNow] = useState(false);
  useEffect(() => {
    if (!choosingPlan) return; // a card change on a running subscription is not a payment for a plan
    const onPaid = () => setPaidNow(true);
    window.addEventListener(PAYMENT_COMPLETED_EVENT, onPaid);
    return () => window.removeEventListener(PAYMENT_COMPLETED_EVENT, onPaid);
  }, [choosingPlan]);
  if (paidNow && billing.status === "active") setPaidNow(false); // it arrived: done waiting (set while rendering, the way React allows for state that follows props)

  // Back from the payment page: the subscription only changes when the provider's notification reaches our server,
  // which can be a few seconds after the user is back. Ask again until it shows, and give up after about a minute.
  const waiting = (returned === "success" || paidNow) && billing.status !== "active";
  const showPlans = choosingPlan && !waiting;
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

  // Back from the payment provider's portal (a separate tab): the card, the plan or the cancellation may have changed there, so ask
  // again when this tab becomes visible. Only for a paying account: that is who has a portal.
  useEffect(() => {
    if (!paid) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") onRefresh().catch(() => {}); // a failed check just leaves what is shown
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [paid, onRefresh]);

  function messageFor(err: unknown) {
    if (err instanceof ApiError && err.status === 503) return text.unavailable;
    if (err instanceof ApiError && err.status === 409) return err.messages.join(". ") || common.genericError;
    return common.genericError;
  }

  // Runs one of the payment actions: for a paying account changing the card, cancelling or resuming, or a plan's checkout. Cards and
  // checkout open as an overlay on this page.
  async function goTo(action: PlanId | PortalAction) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(action);
    setError(null);
    try {
      if (action === "payment") {
        await startPaymentMethodChange();
      } else if (action === "resume") {
        await resumeSubscription();
        await onRefresh();
      } else if (action === "switch") {
        if (!otherPlan) return;
        await changePlan(otherPlan.id);
        setConfirmingSwitch(false);
        await onRefresh();
        setTimeout(() => onRefresh().catch(() => {}), 5000); // the new paid-until date comes with the provider's notification, a moment later
      } else if (action === "cancel") {
        await cancelSubscription();
        setConfirmingCancel(false);
        await onRefresh();
      } else if ((await startPlanCheckout(action)) === "redirected") {
        return; // sent to the provider's own page; otherwise the payment opened in an overlay on this page
      }
    } catch (err) {
      setError(messageFor(err));
      if (err instanceof ApiError && err.status === 409) onRefresh().catch(() => {}); // it changed under the user: show how it really is
    }
    inFlight.current = false;
    setBusy(null);
  }

  const saving = yearlySavingCents(plans.plans);
  const paidPlan = plans.plans.find((plan) => plan.id === billing.plan);
  // The plan a running subscription can be switched to. Only upgrades (monthly -> yearly): they are charged the difference at once. A yearly
  // plan is not switched to monthly mid-year (the usual rule: no money back for a year already paid); the user can cancel and subscribe monthly later.
  const otherPlan = billing.plan === "monthly" ? plans.plans.find((plan) => plan.id === "yearly") : undefined;
  const priceOf = (plan: (typeof plans.plans)[number]) => `${formatMoney(plan.amount_cents, plan.currency)} / ${plan.interval === "month" ? text.month : text.year}`; // its list price, shown next to the plan's name

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[16px] font-semibold">{title}</h2>

      {returned === "success" && billing.status === "active" && (
        <p role="status" className="text-[14px] font-semibold">
          {text.thanks}
        </p>
      )}
      {waiting && (
        <p role="status" className="flex items-center gap-2.5 text-[14px] font-semibold">
          {!gaveUp && <span aria-hidden className="size-4 shrink-0 animate-spin rounded-full border-2 border-black border-t-transparent" />}
          {gaveUp ? text.slow : text.confirming}
        </p>
      )}
      {returned === "cancelled" && !paid && <p className="text-[14px] font-semibold">{text.cancelled}</p>}

      {inTrial && !waiting && (
        <p className="text-[14px]">
          <strong>{text.trialLabel}</strong>{" "}
          {billing.trial_days_left === 0
            ? text.endsToday
            : endSentence(
                `${fill(plural(lang, billing.trial_days_left ?? 0, text.daysLeft), { n: billing.trial_days_left ?? 0 })}${
                  billing.trial_ends_at ? fill(text.until, { date: date(billing.trial_ends_at) }) : ""
                }`,
              )}{" "}
          {text.trialPublic}
        </p>
      )}
      {trialOver && !waiting && (
        <p className="text-[14px]">
          <strong>{text.trialEnded}</strong> {text.trialEndedText}
        </p>
      )}

      {paid && (
        <div className="flex flex-col gap-3">
          <p className="text-[14px]">
            {billing.status === "past_due" ? (
              <>
                <strong>{text.pastDue}</strong> {text.pastDueText}
              </>
            ) : billing.cancel_at_period_end && billing.current_period_end ? (
              // Cancelled but still running: no "you are subscribed" (it would contradict the rest), just what happens.
              endSentence(fill(text.cancelledSub, { date: date(billing.current_period_end) }))
            ) : (
              <>
                <strong>{text.subscribed}</strong>
                {billing.plan ? fill(text.toPlan, { plan: planWord(text.planAdjectives, billing.plan) }) : ""}
                {paidPlan ? ` (${formatMoney(paidPlan.amount_cents, paidPlan.currency)} / ${paidPlan.interval === "month" ? text.month : text.year})` : ""}.{" "}
                {billing.current_period_end && endSentence(fill(text.renews, { date: date(billing.current_period_end) }))}
              </>
            )}
          </p>
          {/* A cancelled subscription is not charged again, so there is no card to keep up to date (resuming brings the button back). */}
          {!billing.cancel_at_period_end && (
            <button type="button" onClick={() => goTo("payment")} disabled={busy !== null} className={SECONDARY}>
              {busy === "payment" ? text.opening : text.updatePayment}
            </button>
          )}
          {billing.status === "active" && !billing.cancel_at_period_end && otherPlan && (
            confirmingSwitch ? (
              <div className="flex flex-col gap-3 border border-black p-4">
                <p className="text-[14px]">{fill(text.switchAsk, { plan: planWord(text.planAdjectives, otherPlan.id), price: priceOf(otherPlan) })}</p>
                <button type="button" onClick={() => goTo("switch")} disabled={busy !== null} className={PRIMARY}>
                  {busy === "switch" ? text.switching : text.confirmSwitch}
                </button>
                <button type="button" onClick={() => setConfirmingSwitch(false)} disabled={busy !== null} className={SECONDARY}>
                  {text.keepPlan}
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmingSwitch(true)} disabled={busy !== null} className={PRIMARY}>
                {fill(text.switchTo, { plan: planWord(text.planAdjectives, otherPlan.id), price: priceOf(otherPlan) })}
              </button>
            )
          )}
          {billing.cancel_at_period_end ? (
            <button type="button" onClick={() => goTo("resume")} disabled={busy !== null} className={PRIMARY}>
              {busy === "resume" ? text.resuming : text.resume}
            </button>
          ) : (
            <>
              {confirmingCancel ? (
                <div className="flex flex-col gap-3 border border-black p-4">
                  <p className="text-[14px]">{billing.current_period_end ? fill(text.cancelAsk, { date: date(billing.current_period_end) }) : text.cancelAskNoDate}</p>
                  <button type="button" onClick={() => goTo("cancel")} disabled={busy !== null} className={DANGER}>
                    {busy === "cancel" ? text.cancelling : text.confirmCancel}
                  </button>
                  <button type="button" onClick={() => setConfirmingCancel(false)} disabled={busy !== null} className={SECONDARY}>
                    {text.keepSubscription}
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmingCancel(true)} disabled={busy !== null} className={DANGER_OUTLINE}>
                  {text.cancelSubscription}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {showPlans && (
        <div className="flex flex-col gap-4">
          {plans.plans.map((plan) => (
            // The yearly plan, when it saves money, gets a thicker border and a tag (p-3.75 + 2px border = the same size as the other card's p-4 + 1px).
            <div key={plan.id} className={`flex flex-col gap-3 border-black ${plan.id === "yearly" && saving > 0 ? "border-2 p-3.75" : "border p-4"}`}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="flex items-center gap-2 text-[16px] font-semibold">
                  {planWord(text.planNames, plan.id, plan.name)}
                  {plan.id === "yearly" && saving > 0 && <span className="bg-black px-1.5 py-0.5 text-[12px] font-semibold text-white">{text.bestValue}</span>}
                </h3>
                <p className="text-[16px] font-semibold">
                  {formatMoney(plan.amount_cents, plan.currency)}
                  <span className="text-[14px] font-normal text-[#4b5563]"> / {plan.interval === "month" ? text.month : text.year}</span>
                </p>
              </div>
              {plan.id === "yearly" && saving > 0 && (
                <p className="text-[14px] text-[#4b5563]">{fill(text.save, { amount: formatMoney(saving, plan.currency) })}</p>
              )}
              <button type="button" onClick={() => goTo(plan.id)} disabled={busy !== null} className={PRIMARY}>
                {busy === plan.id ? text.openingPayment : text.subscribe}
              </button>
            </div>
          ))}
          <p className="text-[14px] text-[#4b5563]">
            {text.note}
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
