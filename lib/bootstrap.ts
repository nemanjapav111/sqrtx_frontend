import { apiFetch } from "@/lib/api";
import type { BillingStatus } from "@/lib/billing";
import type { OnboardingState } from "@/lib/onboarding";

// What GET /account/bootstrap returns (see API.md in the backend): everything a signed-in user's own pages need when they open,
// in ONE request and one database query. `onboarding` is what GET /onboarding/me returns and `billing` what GET /billing/me
// returns; `company_url` is the business page's address (https://sqrtx.co/<address>), null until the profile is saved; `language` is the language
// the user chose for the site ("en", "sr"), null until they choose.
export interface Bootstrap {
  onboarding: OnboardingState;
  company_url: string | null;
  billing: BillingStatus;
  language: string | null;
}

export const getBootstrap = () => apiFetch<Bootstrap>("/account/bootstrap");
