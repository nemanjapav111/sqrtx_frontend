import Link from "next/link";
import BigLogo from "@/app/components/big-logo";
import { formatMoney, yearlySavingCents } from "@/lib/billing-format";
import { LEGAL, LEGAL_LINKS } from "@/lib/legal";
import { getPublicPlans } from "@/lib/public-site";

export const metadata = {
  title: "Pricing – sqrtx",
  description: "sqrtx is free for 30 days, with no card needed. Then one simple plan per business, monthly or yearly.",
};

// The prices come from the API (they are set there and at the payment provider), so this page can never disagree with the account's
// billing section. Built when asked, not while the site is built (the API's answer is kept for an hour). No design for it yet:
// it follows the legal pages (same widths and paddings), and its wording is placeholder.
export const dynamic = "force-dynamic";

const INCLUDED = [
  "A public page for your business at sqrtx.co/your-name, with your logo, address, hours and contact details",
  "Your products and services, with prices and photos",
  "A place in the sqrtx marketplace, where people search by words or by photo and filter by country",
  "A contact form, so visitors can write to you",
];

export default async function Pricing() {
  const { trial_days, plans } = await getPublicPlans();
  const saving = yearlySavingCents(plans);
  const currency = plans[0]?.currency ?? "USD";

  return (
    <main className="flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <div className="flex w-full max-w-200 flex-col items-center">
        <BigLogo />
        <article className="w-full max-w-135 px-5 pt-9.5 md:pt-6">
          <h1 className="text-[20px] font-semibold">Pricing</h1>
          <p className="pt-3 text-[14px] leading-6">
            <strong>Free for {trial_days} days, and no card is needed.</strong> After that, one plan keeps your business page public.
            One subscription covers one business account.
          </p>

          <div className="flex flex-col gap-4 pt-6">
            {plans.map((plan) => (
              <div key={plan.id} className="flex flex-col gap-1 border border-black p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-[16px] font-semibold">{plan.name}</h2>
                  <p className="text-[16px] font-semibold">
                    {formatMoney(plan.amount_cents, plan.currency)}
                    <span className="text-[14px] font-normal text-[#4b5563]"> / {plan.interval}</span>
                  </p>
                </div>
                {plan.id === "yearly" && saving > 0 && (
                  <p className="text-[14px] text-[#4b5563]">Save {formatMoney(saving, currency)} a year compared with monthly.</p>
                )}
              </div>
            ))}
          </div>

          <Link
            href="/register"
            className="mt-6 flex h-11 w-full items-center justify-center bg-black text-[14px] font-bold text-white"
          >
            Start your free {trial_days}-day trial
          </Link>

          <section className="flex flex-col gap-2 pt-8">
            <h2 className="text-[16px] font-semibold">What you get</h2>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-[14px] leading-6">
              {INCLUDED.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-2 pt-8">
            <h2 className="text-[16px] font-semibold">How paying works</h2>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-[14px] leading-6">
              <li>Prices are in US dollars. Taxes such as VAT or sales tax may be added at checkout, depending on where you are.</li>
              <li>You pay by card on {LEGAL.paymentProvider}’s secure page. We never see your card details.</li>
              <li>
                {LEGAL.paymentProvider} is our reseller and the Merchant of Record: it takes the payment, sends your invoice and handles
                refunds.
              </li>
              <li>
                Plans renew automatically until you cancel. You can cancel at any time in your account, and your page stays public until
                the end of the period you paid for.
              </li>
              <li>
                You can ask for a refund within 14 days of a payment: see the{" "}
                <Link href="/legal/refunds" className="underline">
                  Refund Policy
                </Link>
                .
              </li>
              <li>If the trial ends and you have no plan, your page is hidden, not deleted. It is public again when you subscribe.</li>
            </ul>
          </section>

          <div className="flex flex-wrap gap-x-5 pt-6">
            {LEGAL_LINKS.filter((link) => link.href !== "/pricing").map((link) => (
              <Link key={link.href} href={link.href} className="inline-block py-3 text-[14px] font-semibold underline">
                {link.label}
              </Link>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
