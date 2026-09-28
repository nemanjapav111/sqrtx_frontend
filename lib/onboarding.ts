import { apiFetch, jsonBody } from "@/lib/api";
import { getBillingStatus } from "@/lib/billing";
import { getMyProfile, slugFromUrl } from "@/lib/business-profile";

// What GET /onboarding/me returns (see API.md in the backend).
export type OnboardingStep = "business_profile" | "products" | "services" | "final" | "done";

export interface OnboardingState {
  step: OnboardingStep; // the page the user belongs on now
  steps: OnboardingStep[]; // the user's whole path, for a progress indicator
  provides: "products" | "services" | "both" | null;
  completed: boolean;
}

export const getOnboardingState = () => apiFetch<OnboardingState>("/onboarding/me");

/** The user is done with (or skips) this page: the server moves them on and answers with the new state. */
export const completeStep = (step: "products" | "services") =>
  apiFetch<OnboardingState>("/onboarding/next", jsonBody("POST", { step }));

/** The last page: saves the "about the company" text, records the terms/privacy acceptance and completes registration. */
export const finishOnboarding = (aboutCompany: string) =>
  apiFetch<OnboardingState>("/onboarding/finish", jsonBody("POST", { about_company: aboutCompany, terms_accepted: true }));

// Which page each step lives on. Change a route here and everything that sends users to it follows.
// "done" (registration finished) is the account page: the start of the owner area, with billing.
const STEP_PATHS: Record<OnboardingStep, string> = {
  business_profile: "/register/company",
  products: "/register/products",
  services: "/register/services",
  final: "/register/final",
  done: "/account",
};

export const pathForStep = (step: OnboardingStep) => STEP_PATHS[step];

/**
 * Where a logged-in user belongs: the registration page they are on, or, once registration is finished, their own public
 * page (sqrtx.co/<their address>). Used after logging in and wherever a signed-in visitor is sent to "their page".
 * A finished user whose page is hidden (free trial over, not subscribed) goes to the account page instead, because their
 * public page would only say "not found" and the account page is where they subscribe. So does anyone whose profile or
 * billing can't be read right now.
 */
export async function homePath(state: OnboardingState): Promise<string> {
  if (state.step !== "done") return pathForStep(state.step);
  try {
    const [profile, billing] = await Promise.all([getMyProfile(), getBillingStatus()]);
    const slug = profile ? slugFromUrl(profile.company_url) : "";
    return billing.has_access && slug ? `/${slug}` : pathForStep("done");
  } catch {
    return pathForStep("done");
  }
}

/**
 * The page "Next" leads to from `current`: the step after it on the user's own path. Not `state.step`, which is the
 * FURTHEST step reached: someone who went back from Finish to edit an earlier page would be sent straight back to
 * Finish, skipping the pages in between (including a products/services page they just added to their business).
 * Falls back to the furthest step if `current` isn't on the path.
 */
export function pageAfter(state: OnboardingState, current: OnboardingStep): string {
  const next = state.steps[state.steps.indexOf(current) + 1];
  return pathForStep(state.steps.includes(current) && next ? next : state.step);
}
