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

/** "October 30, 2026". */
export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

/** How much the yearly plan saves compared with twelve months of the monthly plan, in cents (0 when it saves nothing). */
export function yearlySavingCents(plans: Plan[]): number {
  const monthly = plans.find((p) => p.id === "monthly");
  const yearly = plans.find((p) => p.id === "yearly");
  return monthly && yearly ? Math.max(0, monthly.amount_cents * 12 - yearly.amount_cents) : 0;
}
