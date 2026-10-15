import { apiFetch, jsonBody } from "@/lib/api";
import type { BillingPlans, PlanId } from "@/lib/billing-format";

// The plans and the money/date helpers live in lib/billing-format.ts (also used by server pages); re-exported so imports from here keep working.
export { formatDate, formatMoney, yearlySavingCents } from "@/lib/billing-format";
export type { BillingPlans, Plan, PlanId } from "@/lib/billing-format";

// The free trial and subscription. The API's rules are in API.md in the backend ("Billing").

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
