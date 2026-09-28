import { apiFetch, jsonBody } from "@/lib/api";

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
 * The page "Next" leads to from `current`: the step after it on the user's own path. Not `state.step`, which is the
 * FURTHEST step reached: someone who went back from Finish to edit an earlier page would be sent straight back to
 * Finish, skipping the pages in between (including a products/services page they just added to their business).
 * Falls back to the furthest step if `current` isn't on the path.
 */
export function pageAfter(state: OnboardingState, current: OnboardingStep): string {
  const next = state.steps[state.steps.indexOf(current) + 1];
  return pathForStep(state.steps.includes(current) && next ? next : state.step);
}
