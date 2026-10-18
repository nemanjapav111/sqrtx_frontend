"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCommonText } from "@/app/[lang]/components/lang-context";
import type { Dictionary } from "@/app/[lang]/dictionaries/en";
import { ApiError } from "@/lib/api";
import { getPaddle, getTiers, startPlanCheckout } from "@/lib/paddle";
import { supabase } from "@/lib/supabase";

type Interval = "month" | "year";

// The prices shown here are Paddle's own, for the visitor's country: `formattedTotals.total` is displayed exactly as Paddle returns it
// (no arithmetic and no re-formatting on this side). `country` is the visitor's country from the request headers, when the host
// sends one; without it Paddle works the country out from the visitor's IP address.
export default function PricingPlans({ text, country }: { text: Dictionary["account"]["billing"]; country?: string }) {
  const router = useRouter();
  const common = useCommonText();
  const [interval, setInterval] = useState<Interval>("month");
  const [totals, setTotals] = useState<Record<Interval, string> | null>(null);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tier = getTiers()[0];
      const paddle = await getPaddle();
      const { data } = await paddle.PricePreview({
        items: [
          { priceId: tier.priceId.month, quantity: 1 },
          { priceId: tier.priceId.year, quantity: 1 },
        ],
        ...(country ? { address: { countryCode: country } } : {}),
      });
      const total = (priceId: string) => data.details.lineItems.find((item) => item.price.id === priceId)?.formattedTotals.total;
      const month = total(tier.priceId.month);
      const year = total(tier.priceId.year);
      if (!month || !year) throw new Error("Paddle did not return both prices.");
      if (!cancelled) setTotals({ month, year });
    })().catch((err) => {
      console.error(err);
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [country]);

  async function subscribe() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/register"); // paying is for an account: make one first (the free trial needs no card)
        return;
      }
      if ((await startPlanCheckout(interval === "month" ? "monthly" : "yearly", { goToAccountAfter: true })) === "redirected") return;
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) setError(text.unavailable);
      else if (err instanceof ApiError && err.status === 409) setError(err.messages.join(". ") || common.genericError);
      else setError(common.genericError);
    }
    inFlight.current = false;
    setBusy(false);
  }

  if (failed) {
    return (
      <p role="alert" className="pt-6 text-[14px] text-red-600">
        {text.unavailable}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-6">
      <div role="group" className="grid grid-cols-2 border border-black text-[14px] font-semibold">
        {(["month", "year"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={interval === value}
            onClick={() => setInterval(value)}
            className={`flex h-11 cursor-pointer items-center justify-center gap-2 ${interval === value ? "bg-black text-white" : "bg-white text-black"}`}
          >
            {value === "month" ? text.planNames.monthly : text.planNames.yearly}
            {value === "year" && <span className="text-[12px]">{text.bestValue}</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-2 border-black p-4">
        <p className="text-[16px] font-semibold">
          {totals ? totals[interval] : <span className="inline-block h-5 w-20 animate-pulse bg-[#e5e7eb] align-middle" aria-hidden="true" />}
          <span className="text-[14px] font-normal text-[#4b5563]"> / {interval === "month" ? text.month : text.year}</span>
        </p>
        <button
          type="button"
          onClick={subscribe}
          disabled={busy || !totals}
          className="flex h-11 w-full cursor-pointer items-center justify-center bg-black text-[14px] font-bold text-white disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? text.openingPayment : text.subscribe}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-[14px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
