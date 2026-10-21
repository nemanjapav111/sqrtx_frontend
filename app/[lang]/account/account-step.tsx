"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { BusinessLink } from "@/app/[lang]/components/business-link";
import { useCallback, useEffect, useState } from "react";
import BigLogo from "@/app/[lang]/components/big-logo";
import { useCommonText } from "@/app/[lang]/components/lang-context";
import type { Dictionary } from "@/app/[lang]/dictionaries/en";
import PendingOverlay from "@/app/[lang]/components/pending-overlay";
import { getBootstrap } from "@/lib/bootstrap";
import { getBillingPlans, getBillingStatus, type BillingPlans, type BillingStatus } from "@/lib/billing";
import { getMyProfile, setProfileActive, SITE_HOST, slugFromUrl } from "@/lib/business-profile";
import { recall, remember } from "@/lib/memory-cache";
import { pathForStep, refreshMyPublicPage } from "@/lib/onboarding";
import VisibilityToggle from "@/app/[lang]/components/visibility-toggle";
import { supabase } from "@/lib/supabase";
import { useRequireSession } from "@/lib/use-session";
import ArrowIcon from "../register/arrow-icon";
import BillingSection from "./billing-section";

type Ready = { status: "ready"; email: string; billing: BillingStatus; plans: BillingPlans; slug: string; offersProducts: boolean; offersServices: boolean; active: boolean };
type Load = { status: "loading" } | { status: "error" } | Ready;

// What was on the page last time (see lib/memory-cache.ts): shown at once when the page is opened again, while the API is asked
// again behind the scenes, instead of dimming the page under "Loading" for data that was on screen a moment ago.
const CACHE_KEY = "owner:account";

// Grey placeholder shapes for the parts of the page whose real content depends on the billing/profile data: unlike a
// form's blank fields (always the same shape), whether these show any text or button at all depends on that data, so
// there's nothing truthful to render in their place until it's known. Reserves roughly the space the real content
// will take instead, so as little as possible shifts once it arrives. While the page loads they are its ONLY loading
// indicator (no spinner and no dimming, however long it takes): they breathe (see `breathe` in globals.css), and stand
// still if loading failed (`breathing` false), where the error box says so.
function TextSkeleton({ breathing }: { breathing: boolean }) {
  return (
    <div aria-hidden className={`flex flex-col gap-1.5 ${breathing ? "breathe" : ""}`}>
      <div className="h-3.5 w-full max-w-100 rounded-sm bg-[#e5e7eb]" />
      <div className="h-3.5 w-2/3 max-w-60 rounded-sm bg-[#e5e7eb]" />
    </div>
  );
}
function ButtonSkeleton({ breathing }: { breathing: boolean }) {
  return <div aria-hidden className={`h-11 w-full bg-[#e5e7eb] ${breathing ? "breathe" : ""}`} />;
}

// A row of the "manage" list on the account page: the name on the left, an arrow on the right, a thin line above. h-12 is more than
// the 44px minimum tap size.
function AccountRow({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex h-12 items-center justify-between border-t border-[#e5e7eb] text-[15px] font-semibold">
      {label}
      <ArrowIcon className="h-3 w-3.5" />
    </Link>
  );
}

// Loads what the page shows, or sends the visitor away if they don't belong here (not logged in, or registration
// not finished yet). The first HTML of the page (built once, see page.tsx) is this loading state, grey placeholders included, so
// nothing but a logo is ever on screen while the browser's code loads.
export default function AccountStep({ text }: { text: Dictionary["account"] }) {
  const router = useRouter();
  const common = useCommonText();
  const session = useRequireSession();
  const [attempt, setAttempt] = useState(0); // "Try again" runs the loading again
  const [load, setLoad] = useState<Load>(() => recall<Ready>(CACHE_KEY) ?? { status: "loading" });

  useEffect(() => {
    if (session !== "signed-in") return;
    let cancelled = false;
    (async () => {
      try {
        // The bootstrap (registration step, address and billing status in one request) and the plans are asked for at the same
        // time (see products/product-edit-step.tsx); the plans are the same for everyone.
        const extra = Promise.all([getBillingPlans(), supabase.auth.getSession(), getMyProfile()]);
        extra.catch(() => undefined);
        const { onboarding, company_url, billing } = await getBootstrap();
        if (onboarding.step !== "done") {
          if (!cancelled) router.replace(pathForStep(onboarding.step)); // registration is not finished (not if they have left this page meanwhile)
          return;
        }
        const [plans, auth, profile] = await extra;
        const slug = company_url ? slugFromUrl(company_url) : "";
        const offersProducts = !!onboarding.provides && onboarding.provides !== "services";
        const offersServices = !!onboarding.provides && onboarding.provides !== "products";
        const ready: Ready = { status: "ready", email: auth.data.session?.user.email ?? "", billing, plans, slug, offersProducts, offersServices, active: profile?.is_active !== false };
        remember(CACHE_KEY, ready);
        if (!cancelled) setLoad(ready);
      } catch {
        // With something already on screen (from the last visit) a failed check is not worth an error box: it stays.
        if (!cancelled) setLoad((now) => (now.status === "ready" ? now : { status: "error" }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, attempt, router]);

  // Asks the API again where the account is (after a payment, or when a subscription changed under the user).
  const refreshBilling = useCallback(async () => {
    const billing = await getBillingStatus();
    setLoad((now) => {
      if (now.status !== "ready") return now;
      const next = { ...now, billing };
      remember(CACHE_KEY, next);
      return next;
    });
  }, []);

  // "Copy link": the public address goes to the clipboard, and the button says so for a moment.
  const [copied, setCopied] = useState(false);
  async function copyLink(slug: string) {
    try {
      await navigator.clipboard.writeText(`https://${SITE_HOST}/${slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no clipboard (an old browser, or the permission was refused): the address is still on screen to copy by hand
    }
  }

  const [loggingOut, setLoggingOut] = useState(false);
  async function logOut() {
    setLoggingOut(true);
    await supabase.auth.signOut({ scope: "local" });
    router.push("/login");
  }

  const pending = load.status === "ready" ? undefined : load.status;
  // While it loads the page is blocked (inert) and shows grey placeholders that breathe: never a spinner or a dimming, however
  // long it takes. Only a failure dims it and says so (with "Try again").
  const loading = pending === "loading";
  const failed = pending === "error";

  return (
    <>
      <BigLogo />
      <h1 className="pt-9.5 pb-10 text-[26px] leading-[1.2] font-bold md:pt-6 md:pb-6">{text.title}</h1>

      {/* relative: PendingOverlay (absolute) floats over this if loading failed. `inert` on the content itself keeps
          it from being read by a screen reader or focused into while it's just a placeholder underneath. */}
      <div className="relative flex w-full max-w-135 flex-col">
        <div
          inert={!!pending}
          className={`flex w-full flex-col gap-10 px-5 pb-10 transition-opacity duration-200 md:pb-6 ${failed ? "opacity-40" : ""}`}
        >
          <section className="flex flex-col gap-2">
            <h2 className="text-[16px] font-semibold">{text.login}</h2>
            <p className="text-[14px]">
              <span className="text-[#4b5563]">{text.email}</span>
              {load.status === "ready" ? (
                load.email
              ) : (
                <span aria-hidden className={`inline-block h-3.5 w-44 rounded-sm bg-[#e5e7eb] align-middle ${loading ? "breathe" : ""}`} />
              )}
            </p>
            {/* A row like the ones under "Your business page", so the links of the page all look alike. */}
            <nav aria-label={text.loginNav} className="mt-2 flex flex-col border-b border-[#e5e7eb]">
              {load.status === "ready" ? (
                <AccountRow href="/account/settings" label={text.changeLogin} />
              ) : (
                // Same height and line as the row, so nothing moves when it arrives.
                <div aria-hidden className="flex h-12 items-center border-t border-[#e5e7eb]">
                  <div className={`h-6 w-full bg-[#e5e7eb] ${loading ? "breathe" : ""}`} />
                </div>
              )}
            </nav>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-[16px] font-semibold">{text.pageTitle}</h2>
            {load.status === "ready" ? (
              <>
                {/* A small square, like the logo: green and pulsing while the page is public (the pulse is dropped for people who ask for less
                    motion), yellow and still while it is hidden (by the owner, or because the trial is over). */}
                <p className="flex items-center gap-2 text-[14px] font-semibold">
                  <span aria-hidden className="relative flex size-2.5">
                    {load.billing.has_access && load.active && <span className="absolute inset-0 animate-ping bg-[#22c55e] opacity-60 motion-reduce:hidden" />}
                    <span className={`relative size-2.5 ${load.billing.has_access && load.active ? "bg-[#22c55e]" : "bg-[#eab308]"}`} />
                  </span>
                  {load.billing.has_access && load.active ? text.live : text.hidden}
                </p>
                {/* "Live" says it all while the page is public; a hidden page gets the explanation. */}
                {!load.billing.has_access && (
                  <p className="text-[14px]">
                    {text.hiddenText}
                  </p>
                )}
                {/* Only when there is something to see: hidden from the public (trial over, not subscribed) or a
                    profile that failed to load would just land on a "not found" page. A real button, not a plain link
                    like "Change login email" above: for someone whose page is public this is likely the thing they came
                    here to do, so it gets the same weight as "Manage subscription" below, not a line of text next to it. */}
                {/* The address itself, with a way to copy it: this is where owners come to find the link to share. */}
                {load.billing.has_access && load.active && load.slug && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 text-[14px] font-semibold break-all">
                      {SITE_HOST}/{load.slug}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyLink(load.slug)}
                      className="flex h-11 shrink-0 cursor-pointer items-center text-[14px] font-semibold underline"
                    >
                      {copied ? text.copied : text.copy}
                    </button>
                  </div>
                )}
                {load.billing.has_access && load.active && load.slug && (
                  <BusinessLink slug={load.slug} className="flex h-11 w-full items-center justify-center bg-black text-[14px] font-bold text-white">
                    {text.view}
                  </BusinessLink>
                )}
                {/* The owner's own switch: hides the whole page (with its products and services) from the public, or shows it again. Only offered while
                    the page could be public (a hidden page whose trial is over says why above, and can't be shown by this). */}
                {load.billing.has_access && (
                  <VisibilityToggle
                    bare
                    text={text.pageVisibility}
                    active={load.active}
                    onChange={async (next) => {
                      await setProfileActive(next);
                      setLoad((now) => {
                        if (now.status !== "ready") return now;
                        const updated = { ...now, active: next };
                        remember(CACHE_KEY, updated);
                        return updated;
                      });
                      await refreshMyPublicPage();
                    }}
                  />
                )}
                {/* Where to go next: plain rows, not buttons, so "View my page" above is the only button that stands out. The
                    profile (name, address, contact, logo, ...) is editable whatever the billing state; products and services
                    only when the business offers them (known once this has arrived, so a row that then disappears moves nothing). */}
                <nav aria-label={text.manageAria} className="mt-2 flex flex-col border-b border-[#e5e7eb]">
                  <AccountRow href="/account/profile" label={text.editProfile} />
                  {load.offersProducts && <AccountRow href="/account/products" label={text.manageProducts} />}
                  {load.offersServices && <AccountRow href="/account/services" label={text.manageServices} />}
                </nav>
              </>
            ) : (
              <>
                <TextSkeleton breathing={loading} />
                {/* Reserves the space for "View my page" (or, later, an "activate profile" button for a hidden
                    page): which one, or neither, depends on billing we don't have yet. */}
                <ButtonSkeleton breathing={loading} />
              </>
            )}
          </section>

          {load.status === "ready" ? (
            <BillingSection text={text.billing} title={text.billingTitle} billing={load.billing} plans={load.plans} onRefresh={refreshBilling} />
          ) : (
            <section className="flex flex-col gap-4">
              <h2 className="text-[16px] font-semibold">{text.billingTitle}</h2>
              <TextSkeleton breathing={loading} />
              <ButtonSkeleton breathing={loading} />
            </section>
          )}

        </div>

        {failed && (
          <PendingOverlay
            state="error"
            onRetry={() => {
              setLoad({ status: "loading" });
              setAttempt((n) => n + 1);
            }}
          />
        )}
      </div>

      {/* A terminal, whole-account action: last on the page rather than folded into "Login" above, so it doesn't
          interrupt the read before Billing. Outside the `inert` content so it still works when loading failed (the
          user can always leave); not drawn while loading, where it would just flash in. It is the last thing on the
          page, so it appearing later shifts nothing above it. */}
      {load.status !== "loading" && (
        <div className="flex w-full max-w-135 justify-center px-5 pb-10 md:pb-6">
          {/* Grey text, like "Log out" on the registration pages: it should not look as important as "View my page". */}
          <button
            type="button"
            onClick={logOut}
            disabled={loggingOut}
            className="flex h-11 cursor-pointer items-center px-3 text-[14px] font-medium text-[#737373] transition-colors hover:text-black focus-visible:text-black focus-visible:outline-2 focus-visible:outline-black disabled:cursor-wait disabled:opacity-60"
          >
            {loggingOut ? text.loggingOut : common.logOut}
          </button>
        </div>
      )}
    </>
  );
}
