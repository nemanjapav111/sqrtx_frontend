import { apiFetch, jsonBody } from "@/lib/api";

// The free trial and subscription. The API's rules are in API.md in the backend ("Billing").

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

// What GET /billing/me returns. `not_started`: registration is not finished, so there is no trial yet.
export interface BillingStatus {
  status: "not_started" | "trialing" | "active" | "past_due" | "expired";
  has_access: boolean; // is the business page public right now?
  plan: string | null;
  trial_ends_at: string | null;
  trial_days_left: number | null; // whole days, only while trialing
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export const getBillingPlans = () => apiFetch<BillingPlans>("/billing/plans");
export const getBillingStatus = () => apiFetch<BillingStatus>("/billing/me");

// Both answer the address of a page at the payment provider. The browser is sent there (see goToProvider).
export const startCheckout = (plan: PlanId) => apiFetch<{ url: string }>("/billing/checkout", jsonBody("POST", { plan }));
export const openBillingPortal = () => apiFetch<{ url: string }>("/billing/portal", { method: "POST" });

/** Sends the browser to a page at the payment provider. Only https addresses: anything else is refused. */
export function goToProvider(url: string): boolean {
  if (!url.startsWith("https://")) return false;
  window.location.assign(url);
  return true;
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
