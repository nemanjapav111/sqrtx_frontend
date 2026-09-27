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
// TODO: "done" goes to the landing page for now.
const STEP_PATHS: Record<OnboardingStep, string> = {
  business_profile: "/register/company",
  products: "/register/products",
  services: "/register/services",
  final: "/register/final",
  done: "/",
};

export const pathForStep = (step: OnboardingStep) => STEP_PATHS[step];
