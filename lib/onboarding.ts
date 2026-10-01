import { apiFetch, jsonBody } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { refreshPublicPage } from "@/lib/refresh-public-page";
import { getBootstrap, type Bootstrap } from "@/lib/bootstrap";
import { slugFromUrl } from "@/lib/business-profile";

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
 * page (sqrtx.co/<their address>). A finished user whose page is hidden (free trial over, not subscribed) goes to the account
 * page instead, because their public page would only say "not found" and the account page is where they subscribe.
 */
export function homePathFor({ onboarding, company_url, billing }: Bootstrap): string {
  if (onboarding.step !== "done") return pathForStep(onboarding.step);
  const slug = company_url ? slugFromUrl(company_url) : "";
  return billing.has_access && slug ? `/${slug}` : pathForStep("done");
}

/** Asks the API where the signed-in user belongs (see homePathFor): one request. Throws if it can't be asked. */
export async function getHomePath(): Promise<string> {
  return homePathFor(await getBootstrap());
}

/**
 * The same, for a page that already asked for the registration state: a user who is not finished belongs on their step's page
 * without another request; a finished one is asked once (the bootstrap). Anyone whose answer can't be read right now goes to
 * the account page.
 */
export async function homePath(state: OnboardingState): Promise<string> {
  if (state.step !== "done") return pathForStep(state.step);
  try {
    return await getHomePath();
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
