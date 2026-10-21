import { apiFetch, jsonBody } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { refreshPublicPage } from "@/lib/refresh-public-page";
import { getBootstrap, type Bootstrap } from "@/lib/bootstrap";
import { slugFromUrl } from "@/lib/business-profile";
import { DEFAULT_LOCALE, LOCALES, addressInLanguage } from "@/lib/i18n";
import { readLanguageCookie } from "@/lib/language-cookie";

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
export async function refreshMyPublicPage(previousSlug?: string, items: string[] = []) {
  let slug: string | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) slug = await refreshPublicPage(data.session.access_token, previousSlug);
  } catch (error) {
    // Never fails the save, but said in the browser's console: otherwise a refresh that did not happen (for example a page opened before a deploy) leaves no trace.
    console.error("The site's saved copies of the owner's page were not cleared:", error);
  }
  await refreshBrowserCopies([slug, previousSlug], items, slug);
}

// The site's saved copies are cleared by the call above, but this browser keeps its own (pages the owner opened before the save, which it shows first while it
// asks again). So it asks again, right now and bypassing what it kept, for exactly the pages the save changed: the business's page(s) and each saved item
// ("product/<name>-<id>" or "service/...", under the marketplace's address and under the business's own, in every language). One saved copy per address is
// kept, so this replaces the link-click version of the page as well. Best effort, like the rest.
async function refreshBrowserCopies(slugs: (string | null | undefined)[], items: string[], slug: string | null) {
  const langs = LOCALES.filter((lang) => lang !== DEFAULT_LOCALE).map((lang) => `/${lang}`);
  const bases = ["", ...langs];
  const paths = new Set<string>();
  for (const base of bases) {
    for (const address of slugs) if (address) paths.add(`${base}/${address}`);
    for (const item of items) {
      paths.add(`${base}/${item}`);
      if (slug) paths.add(`${base}/${slug}/${item}`);
    }
  }
  await Promise.all(
    [...paths].map((path) => fetch(path, { cache: "reload", credentials: "same-origin", signal: AbortSignal.timeout(4000) }).catch(() => undefined)),
  );
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
  const path = homePathFor(await getBootstrap());
  // The owner's own page is a business's page, whose address carries the language (/sr/vega): they land on the copy in the language they chose.
  const lang = readLanguageCookie();
  return lang ? addressInLanguage(path, lang) : path;
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
