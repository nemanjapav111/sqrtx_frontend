import { apiFetch } from "@/lib/api";
import type { BillingStatus } from "@/lib/billing";
import type { OnboardingState } from "@/lib/onboarding";

// What GET /account/bootstrap returns (see API.md in the backend): everything a signed-in user's own pages need when they open,
// in ONE request and one database query. `onboarding` is what GET /onboarding/me returns and `billing` what GET /billing/me
// returns; `company_url` is the business page's address (https://sqrtx.co/<address>), null until the profile is saved.
export interface Bootstrap {
  onboarding: OnboardingState;
  company_url: string | null;
  billing: BillingStatus;
}

export const getBootstrap = () => apiFetch<Bootstrap>("/account/bootstrap");
