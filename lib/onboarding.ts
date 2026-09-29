import { apiFetch, jsonBody } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { refreshPublicPage } from "@/lib/refresh-public-page";
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
export async function finishOnboarding(aboutCompany: string) {
  const state = await apiFetch<OnboardingState>(
    "/onboarding/finish",
    jsonBody("POST", { about_company: aboutCompany, terms_accepted: true }),
  );
  await refreshMyPublicPage(); // the business is public from now on: the page must not be shown from a saved older copy
  return state;
}

/**
 * Makes the site forget its saved copy of the signed-in owner's public page (see lib/refresh-public-page.ts), so their
 * next load shows their newest data. Call it after anything that changes that page (`previousSlug`: the address it had
 * before, when the address was changed). Best effort: if it fails the page
 * simply catches up by itself within a minute, so it must never fail the action it follows.
 */
export async function refreshMyPublicPage(previousSlug?: string) {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) await refreshPublicPage(data.session.access_token, previousSlug);
  } catch {
    // ignored on purpose, see above
  }
}

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
