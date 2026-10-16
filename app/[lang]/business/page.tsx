import type { Metadata } from "next";
import Link from "next/link";
import LoginLink from "@/app/[lang]/components/login-link";
import { formatMoney } from "@/lib/billing-format";
import { LEGAL, LEGAL_LINKS } from "@/lib/legal";
import { asLocale, fill } from "@/lib/i18n";
import { getPublicPlans } from "@/lib/public-site";
import { getDictionary } from "../dictionaries";
import EnterLink from "./enter-link";
import HeroShowcase from "./showcase";

export async function generateMetadata({ params }: PageProps<"/[lang]/business">): Promise<Metadata> {
  const { lang } = await params;
  const t = (await getDictionary(asLocale(lang))).landing;
  return { title: t.metaTitle, description: t.metaDescription };
}

// sqrtx.co/business: the landing page for BUSINESSES (the first page of the site until the marketplace took "/" on 2026-10-01; restored 2026-10-11 and
// redesigned the same day from the owner's concept for phone, tablet and desktop). Black page, a green accent, no design in Figma: the sizes are the concept's.
//  - Header: the logo; Log in and Create my page (and, from 1120px, the links to the marketplace and Pricing).
//  - Hero: the headline, the two buttons and "30 days free"; beside it (desktop) or under it (tablet, phone) a small picture of a business's page.
//  - Six things a business gets (icon, title, line), the three steps to be live, the price line from the API (so it can never disagree with the account's billing section) with
//    the green button on every size, and the legal links.
// Phone = default, tablet = md: (768px), desktop = min-[1120px]: (the same width the site's other pages switch at). Built when asked, not while the site is built
// (the plans come from the API).
export const dynamic = "force-dynamic";

// Which text of the dictionary names each legal page.
const LEGAL_KEY = { "/pricing": "pricing", "/terms": "terms", "/privacy": "privacy", "/legal/refunds": "refunds" } as const;

const GREEN = "bg-[#009a1c]";
const BUTTON = "flex items-center justify-center text-[13px] font-medium";

// A small line icon (24 x 24, a 1.8px line) in an outlined square: the mark of a feature.
function FeatureIcon({ children }: { children: React.ReactNode }) {
  return (
    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center border border-[#262626] text-[#00cf37]">
      <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </span>
  );
}

// What a business gets: six things, each with its icon (the title and the line are in the dictionaries, under the same key). The first and the third lines are the owner's wording (Smart search is as the owner first wrote it; the line "Discovered on the sqrtx platform..." is the only line of Products and services, which has the target icon: his decisions of 2026-10-12).
const FEATURES = [
  {
    key: "page",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18" />
      </>
    ),
  },
  {
    key: "discover",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
  },
  {
    key: "search",
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
  },
  {
    key: "contact",
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
  },
  {
    key: "update",
    icon: (
      <>
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M11 18h2" />
      </>
    ),
  },
  {
    key: "free",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
] as const;

// How it starts: three steps (their texts are in the dictionaries, under the same key).
const STEPS = ["register", "business", "live"] as const;

export default async function BusinessLanding({ params }: PageProps<"/[lang]/business">) {
  const { lang } = await params;
  const dictionary = await getDictionary(asLocale(lang));
  const t = dictionary.landing;
  const { trial_days, plans } = await getPublicPlans();
  const prices = plans.map((plan) => ({ id: plan.id, text: fill(plan.interval === "month" ? t.price.perMonth : t.price.perYear, { amount: formatMoney(plan.amount_cents, plan.currency) }), bold: true }));

  return (
    <main data-dark-page className="flex flex-1 flex-col items-center bg-black text-white">
      {/* Header */}
      <header className="w-full border-b border-[#1f1f1f]">
        <div className="mx-auto flex h-16.75 w-full max-w-297.5 items-center justify-between px-4.75 min-[1120px]:px-7.5">
          {/* The same logo as the marketplace's bar (home/home-header.tsx): a white square of 19px (moved down 1.3px to sit level with the "s"), 5px, then "sqrtx" in bold 16px, 1px lower than the square. */}
          <EnterLink className="flex shrink-0 items-center gap-[5px] text-[16px] text-white">
            <span aria-hidden className="size-[19px] bg-white" style={{ transform: "translateY(1.3px)" }} />
            <span className="translate-y-px leading-[1.21] font-bold tracking-[0]">sqrtx</span>
          </EnterLink>
          <nav aria-label={t.nav.label} className="flex items-center gap-4.5 text-[12px] md:gap-3">
            {/* The way into the marketplace for a visitor who is not a business: a plain link, on every size (the logo goes there too, with the same fade: both are an EnterLink). */}
            <EnterLink className="text-[#a3a3a3] hover:text-white">{t.nav.enter}</EnterLink>
            <Link href="/pricing" target="_blank" rel="noopener" className="mr-1.5 hidden text-[#a3a3a3] hover:text-white min-[1120px]:block">
              {t.nav.pricing}
            </Link>
            <LoginLink className="border border-[#525252] px-3 py-1.5 hover:border-white md:px-3.5">{t.nav.logIn}</LoginLink>
            <Link href="/register" className={`${GREEN} hidden px-3.5 py-1.75 font-medium md:block`}>
              {t.nav.create}
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex w-full max-w-297.5 flex-col px-4 md:max-[1120px]:px-12.5 min-[1120px]:px-7.5">
        {/* Hero */}
        <section className="relative flex flex-col gap-8 pt-9 pb-8 md:max-[1120px]:items-center md:max-[1120px]:pt-12 min-[1120px]:grid min-[1120px]:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] min-[1120px]:items-center min-[1120px]:min-h-[calc(100svh-67px-120px)] min-[1120px]:gap-12 min-[1120px]:pt-20 min-[1120px]:pb-12">
          {/* min-[1120px]:pb-8: the text sits ABOVE the middle of the picture (the owner asked three times: 24px up, then 40px, then down to 32px, then 28px, then 24px, then 16px): on the page the eye reads the middle of a block as lower than it is */}
          <div className="flex flex-col md:max-[1120px]:items-center md:max-[1120px]:text-center min-[1120px]:pb-8">
            <p className="mb-3 text-[11px] tracking-[0.08em] text-[#00cf37] min-[1120px]:mb-4 min-[1120px]:text-[12px]">{t.hero.kicker}</p>
            <h1 className="text-[28px] leading-[1.18] font-medium md:max-[1120px]:max-w-140 md:max-[1120px]:text-[34px] min-[1120px]:text-[42px] min-[1120px]:leading-[1.12] min-[1280px]:text-[48px]">
              {t.hero.headlineA}{" "}
              <br className="hidden min-[1120px]:block" />
              {t.hero.headlineB}
              <br />
              <span className="text-[#00cf37]">{t.hero.headlineC}</span>
            </h1>
            <p className="mt-3.5 max-w-90 text-[14px] leading-[1.55] text-[#a3a3a3] md:max-w-105 min-[1120px]:mt-5 min-[1120px]:max-w-115 min-[1120px]:text-[17px]">
              {t.hero.intro}
            </p>
            <div className="mt-5 flex w-full flex-col md:w-auto md:flex-row md:gap-2.5 min-[1120px]:mt-7">
              <Link href="/register" className={`${BUTTON} ${GREEN} h-11 px-6 md:h-10.5 min-[1120px]:h-12 min-[1120px]:px-8 min-[1120px]:text-[15px]`}>
                {t.nav.create}
              </Link>
            </div>
            <p className="mt-2.5 text-[12px] text-[#a3a3a3] max-md:text-center min-[1120px]:mt-5 min-[1120px]:flex min-[1120px]:gap-5 min-[1120px]:text-[13px]">
              <span className="min-[1120px]:before:mr-1.5 min-[1120px]:before:text-[#00cf37] min-[1120px]:before:content-['✓']">
                {fill(t.hero.daysFree, { n: trial_days })}<span className="min-[1120px]:hidden">.</span>
              </span>{" "}
              <span className="min-[1120px]:before:mr-1.5 min-[1120px]:before:text-[#00cf37] min-[1120px]:before:content-['✓']">
                {t.hero.noCard}<span className="min-[1120px]:hidden">.</span>
              </span>
              <span className="hidden min-[1120px]:block min-[1120px]:before:mr-1.5 min-[1120px]:before:text-[#00cf37] min-[1120px]:before:content-['✓']">{t.hero.liveInMinutes}</span>
            </p>

          </div>
          <div aria-hidden className="pointer-events-none absolute top-1/2 right-0 hidden h-130 w-175 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(255,255,255,0.2),transparent)] blur-[30px] min-[1120px]:block" />
          <HeroShowcase text={t.demo} />
        </section>

        {/* What a business gets */}
        <section aria-labelledby="features-title" className="pt-10 pb-4 min-[1120px]:pt-16 min-[1120px]:pb-8">
          <h2 id="features-title" className="text-[22px] text-center font-medium min-[1120px]:text-[32px]">
            {t.features.title}
          </h2>
          <p className="mx-auto mt-2.5 text-center text-[14px] leading-[1.55] text-[#a3a3a3] min-[1120px]:mt-3 min-[1120px]:max-w-150 min-[1120px]:text-[16px]">
            {t.features.intro}
          </p>
          <div className="mt-8 grid gap-x-8 gap-y-7 md:grid-cols-2 min-[1120px]:grid-cols-3 min-[1120px]:mt-12 min-[1120px]:gap-x-10 min-[1120px]:gap-y-12">
            {FEATURES.map((feature) => (
              <div key={feature.key} className="flex gap-3.5 border-t border-[#262626] pt-4 min-[1120px]:gap-4 min-[1120px]:border min-[1120px]:bg-[#070707] min-[1120px]:p-7">
                <FeatureIcon>{feature.icon}</FeatureIcon>
                <div>
                  <h3 className="text-[14px] font-medium min-[1120px]:text-[15px]">{t.features[feature.key].title}</h3>
                  <p className="mt-1 text-[13px] leading-[1.55] text-[#a3a3a3] min-[1120px]:mt-1.5 min-[1120px]:text-[14px]">{t.features[feature.key].text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it starts */}
        <section aria-labelledby="steps-title" className="pt-10 pb-8 min-[1120px]:pt-14 min-[1120px]:pb-10">
          <h2 id="steps-title" className="text-[22px] font-medium min-[1120px]:text-[26px]">
            {t.steps.title}
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-4 md:flex-col md:gap-3">
                <span className="text-[22px] leading-none font-medium text-[#00cf37] tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-[14px] font-medium">{t.steps[step].title}</h3>
                  <p className="mt-1 text-[13px] leading-[1.55] text-[#a3a3a3]">{t.steps[step].text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Price */}
        <section className="mt-4 flex flex-col items-center gap-3 border border-[#262626] px-4 py-3.5 text-center text-[13px] min-[1120px]:flex-row min-[1120px]:justify-between min-[1120px]:px-5 min-[1120px]:py-4 min-[1120px]:text-left">
          <p>
            {fill(t.price.freeFor, { n: trial_days })}{" "}
            {prices.map((price, index) => (
              <span key={price.id}>
                {index > 0 && ` ${t.price.or} `}
                <span className="font-medium">{price.text}</span>
              </span>
            ))}
          </p>
          <Link href="/register" className={`${GREEN} flex h-10 w-full items-center justify-center px-5 text-[13px] font-medium min-[1120px]:w-auto`}>
            {t.nav.create}
          </Link>
        </section>

        {/* Foot: the legal pages (they open in a new tab, so the visitor keeps this page) and the contact. No link to the marketplace here (the owner): it is at the top. */}
        <footer className="flex flex-col items-center gap-2.5 pt-8 pb-8 text-center text-[11px] text-[#a3a3a3]">
          <nav aria-label={dictionary.legal.navLabel} className="flex flex-wrap justify-center gap-x-4 gap-y-1 min-[1120px]:gap-x-4.5">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} target="_blank" rel="noopener" className="py-1 hover:text-white">
                {dictionary.legal.links[LEGAL_KEY[link.href]]}
              </Link>
            ))}
          </nav>
          <p>
            {LEGAL.email} · © 2026 sqrtx
          </p>
        </footer>
      </div>
    </main>
  );
}
