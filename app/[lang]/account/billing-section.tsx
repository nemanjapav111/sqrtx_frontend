"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCommonText, useLang } from "@/app/[lang]/components/lang-context";
import type { Dictionary } from "@/app/[lang]/dictionaries/en";
import { ApiError } from "@/lib/api";
import { FORMAT_LOCALE, fill, plural } from "@/lib/i18n";
import {
  formatDate,
  formatMoney,
  goToProvider,
  openBillingPortal,
  planWord,
  startCheckout,
  yearlySavingCents,
  type BillingPlans,
  type BillingStatus,
  type PlanId,
} from "@/lib/billing";

// A sentence that ends in a date: Serbian dates already end in a full stop ("14. novembra 2026."), so it is not added twice.
const endSentence = (sentence: string) => (sentence.endsWith(".") ? sentence : `${sentence}.`);

const POLL_EVERY_MS = 3000;
const POLLS = 20; // about a minute: a payment is confirmed by the provider's notification, which normally takes seconds

const PRIMARY = "flex h-11 w-full cursor-pointer items-center justify-center bg-black font-bold text-white disabled:cursor-wait disabled:opacity-60";
const SECONDARY =
  "flex h-11 w-full cursor-pointer items-center justify-center border-2 border-black bg-white font-bold disabled:cursor-wait disabled:opacity-60";

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
  const returned = checkout === "success" || checkout === "cancelled" ? checkout : null;
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
    if (err instanceof ApiError && err.status === 503) return text.unavailable;
    if (err instanceof ApiError && err.status === 409) return err.messages.join(". ") || common.genericError;
    return common.genericError;
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
      setError(common.genericError);
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
      <h2 className="text-[16px] font-semibold">{title}</h2>

      {returned === "success" && billing.status === "active" && (
        <p role="status" className="text-[14px] font-semibold">
          {text.thanks}
        </p>
      )}
      {waiting && (
        <p role="status" className="text-[14px] font-semibold">
          {gaveUp ? text.slow : text.confirming}
        </p>
      )}
      {returned === "cancelled" && !paid && <p className="text-[14px] font-semibold">{text.cancelled}</p>}

      {inTrial && (
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
      {trialOver && (
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
            ) : (
              <>
                <strong>{text.subscribed}</strong>
                {billing.plan ? fill(text.toPlan, { plan: planWord(text.planAdjectives, billing.plan) }) : ""}.{" "}
                {billing.current_period_end &&
                  (billing.cancel_at_period_end
                    ? endSentence(fill(text.cancelledSub, { date: date(billing.current_period_end) }))
                    : endSentence(fill(text.renews, { date: date(billing.current_period_end) })))}
              </>
            )}
          </p>
          <button type="button" onClick={() => goTo("portal")} disabled={busy !== null} className={SECONDARY}>
            {busy === "portal" ? text.opening : text.manage}
          </button>
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
