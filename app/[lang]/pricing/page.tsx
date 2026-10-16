import type { Metadata } from "next";
import Link from "next/link";
import { lang as pageLang } from "next/root-params";
import BigLogo from "@/app/[lang]/components/big-logo";
import { formatMoney, planWord, yearlySavingCents } from "@/lib/billing-format";
import { asLocale, fill } from "@/lib/i18n";
import { LEGAL, LEGAL_LINKS } from "@/lib/legal";
import { getPublicPlans } from "@/lib/public-site";
import { getDictionary } from "../dictionaries";

export async function generateMetadata({ params }: PageProps<"/[lang]/pricing">): Promise<Metadata> {
  const { pricing } = await getDictionary(asLocale((await params).lang));
  return { title: pricing.metaTitle, description: pricing.metaDescription };
}

// The prices come from the API (they are set there and at the payment provider), so this page can never disagree with the account's
// billing section. Built when asked, not while the site is built (the API's answer is kept for an hour). No design for it yet:
// it follows the legal pages (same widths and paddings), and its wording is placeholder.
export const dynamic = "force-dynamic";

// Which text of the dictionary names each legal page (the same as the landing page's).
const LEGAL_KEY = { "/pricing": "pricing", "/terms": "terms", "/privacy": "privacy", "/legal/refunds": "refunds" } as const;
const INCLUDED = ["page", "items", "marketplace", "contact"] as const;

export default async function Pricing() {
  const { trial_days, plans } = await getPublicPlans();
  const dictionary = await getDictionary(asLocale(await pageLang()));
  const { pricing: text, legal } = dictionary;
  const billing = dictionary.account.billing;
  const saving = yearlySavingCents(plans);
  const currency = plans[0]?.currency ?? "USD";

  return (
    <main className="flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <div className="flex w-full max-w-200 flex-col items-center">
        <BigLogo />
        <article className="w-full max-w-135 px-5 pt-9.5 md:pt-6">
          <h1 className="text-[20px] font-semibold">{text.title}</h1>
          <p className="pt-3 text-[14px] leading-6">
            <strong>{fill(text.freeLead, { days: trial_days })}</strong> {text.freeRest}
          </p>

          <div className="flex flex-col gap-4 pt-6">
            {plans.map((plan) => (
              <div key={plan.id} className="flex flex-col gap-1 border border-black p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-[16px] font-semibold">{planWord(billing.planNames, plan.id, plan.name)}</h2>
                  <p className="text-[16px] font-semibold">
                    {formatMoney(plan.amount_cents, plan.currency)}
                    <span className="text-[14px] font-normal text-[#4b5563]"> / {billing[plan.interval]}</span>
                  </p>
                </div>
                {plan.id === "yearly" && saving > 0 && (
                  <p className="text-[14px] text-[#4b5563]">{fill(billing.save, { amount: formatMoney(saving, currency) })}</p>
                )}
              </div>
            ))}
          </div>

          <Link
            href="/register"
            className="mt-6 flex h-11 w-full items-center justify-center bg-black text-[14px] font-bold text-white"
          >
            {fill(text.start, { days: trial_days })}
          </Link>

          <section className="flex flex-col gap-2 pt-8">
            <h2 className="text-[16px] font-semibold">{text.includedTitle}</h2>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-[14px] leading-6">
              {INCLUDED.map((key) => (
                <li key={key}>{text.included[key]}</li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-2 pt-8">
            <h2 className="text-[16px] font-semibold">{text.payTitle}</h2>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-[14px] leading-6">
              <li>{text.pay.currency}</li>
              <li>{fill(text.pay.card, { provider: LEGAL.paymentProvider })}</li>
              <li>{fill(text.pay.reseller, { provider: LEGAL.paymentProvider })}</li>
              <li>{text.pay.renew}</li>
              <li>
                {text.pay.refund}{" "}
                <Link href="/legal/refunds" className="underline">
                  {legal.links.refunds}
                </Link>
                .
              </li>
              <li>{text.pay.hidden}</li>
            </ul>
          </section>

          <div className="flex flex-wrap gap-x-5 pt-6">
            {LEGAL_LINKS.filter((link) => link.href !== "/pricing").map((link) => (
              <Link key={link.href} href={link.href} className="inline-block py-3 text-[14px] font-semibold underline">
                {legal.links[LEGAL_KEY[link.href]]}
              </Link>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
