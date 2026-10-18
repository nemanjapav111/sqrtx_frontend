import { apiFetch, jsonBody } from "@/lib/api";
import type { BillingPlans, PlanId } from "@/lib/billing-format";

// The plans and the money/date helpers live in lib/billing-format.ts (also used by server pages); re-exported so imports from here keep working.
export { formatDate, formatMoney, planWord, yearlySavingCents } from "@/lib/billing-format";
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

// Both answer the address of a page at the payment provider (checkout also answers the payment's id, to open it in an overlay). The browser is sent there (see goToProvider).
export const startCheckout = (plan: PlanId) => apiFetch<{ url: string; transaction_id?: string }>("/billing/checkout", jsonBody("POST", { plan }));
// `cancel_url` and `update_payment_method_url` open the provider straight on that one action (absent when it has no such link: use `url`).
// Moves the running subscription to the other plan; the difference for the time already paid for is charged now.
export const changePlan = (plan: PlanId) => apiFetch<{ plan: PlanId }>("/billing/change-plan", jsonBody("POST", { plan }));
// Cancels at the end of the paid period: the subscription runs until then and does not renew.
export const cancelSubscription = () => apiFetch<{ cancelled: true }>("/billing/cancel", { method: "POST" });
// Takes back a cancellation that has not happened yet (the subscription runs until the end of the paid period).
export const resumeSubscription = () => apiFetch<{ resumed: true }>("/billing/resume", { method: "POST" });
// The payment for entering a new card, to open in the provider's overlay (see startPaymentMethodChange in lib/paddle.ts).
export const getPaymentMethodChange = () => apiFetch<{ transaction_id: string }>("/billing/payment-method", { method: "POST" });
export const openBillingPortal = () =>
  apiFetch<{ url: string; cancel_url?: string; update_payment_method_url?: string }>("/billing/portal", { method: "POST" });

/** Sends the browser to a page at the payment provider. Only https addresses: anything else is refused. */
export function goToProvider(url: string): boolean {
  if (!url.startsWith("https://")) return false;
  window.location.assign(url);
  return true;
}
