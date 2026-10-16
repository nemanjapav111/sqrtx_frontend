// The plans' shapes and the money/date/saving helpers, with nothing that needs the browser: the pricing page (a server component) uses
// them too. lib/billing.ts re-exports them, so the account page keeps importing from there.

export type PlanId = "monthly" | "yearly";

// What GET /billing/plans returns: the paid plans and the trial length. The prices are set in the API, not here.
export interface Plan {
  id: PlanId;
  name: string;
  amount_cents: number;
  currency: string;
  interval: "month" | "year";
}

export interface BillingPlans {
  trial_days: number;
  plans: Plan[];
}

/** "$11.10" or "$111": cents shown as money, without ".00" for whole amounts. */
export function formatMoney(cents: number, currency: string): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

// Serbian writes a date's month in the genitive ("14. novembra 2026."), the browser's long format has the plain name ("novembar").
const SERBIAN_GENITIVE: Record<string, string> = {
  januar: "januara", februar: "februara", mart: "marta", april: "aprila", maj: "maja", jun: "juna",
  jul: "jula", avgust: "avgusta", septembar: "septembra", oktobar: "oktobra", novembar: "novembra", decembar: "decembra",
};

/** "October 30, 2026" (`locale` is a language tag, "en-US" when not given). */
export const formatDate = (iso: string, locale = "en-US") => {
  const text = new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
  return locale.startsWith("sr") ? text.replace(/[a-zčćšžđ]+/i, (month) => SERBIAN_GENITIVE[month.toLowerCase()] ?? month) : text;
};

/** How much the yearly plan saves compared with twelve months of the monthly plan, in cents (0 when it saves nothing). */
export function yearlySavingCents(plans: Plan[]): number {
  const monthly = plans.find((p) => p.id === "monthly");
  const yearly = plans.find((p) => p.id === "yearly");
  return monthly && yearly ? Math.max(0, monthly.amount_cents * 12 - yearly.amount_cents) : 0;
}

/** A plan's name in the language of the page, from the plan's id or the API's name ("monthly" / "Monthly"): a plan the page has no word for keeps the API's name. */
export function planWord(words: { monthly: string; yearly: string }, key: string, fallback = key): string {
  const lower = key.toLowerCase();
  return lower === "monthly" ? words.monthly : lower === "yearly" ? words.yearly : fallback;
}
