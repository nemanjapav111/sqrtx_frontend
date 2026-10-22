import Link from "next/link";
import LegalDocument, { LegalList, LegalSection } from "@/app/[lang]/components/legal-document";
import { LEGAL, LEGAL_LINKS, TERMS_VERSION } from "@/lib/legal";

export const metadata = { title: "Refund Policy – sqrtx" };

// DRAFT, like the Terms: for the owner to confirm (the 14 days are a proposal) and a lawyer to review. It is part of the Terms
// (section 6 points here), so it has the Terms' version: when this text changes, raise TERMS_VERSION and CURRENT_TERMS_VERSION in
// the backend together. Keep it true to what the payment provider (LEGAL.paymentProvider) really does with refunds.
export default function Refunds() {
  return (
    <LegalDocument title="Refund Policy" version={TERMS_VERSION} updated="October 22, 2026" draft={false} other={LEGAL_LINKS.filter((link) => link.href !== "/legal/refunds")}>
      <LegalSection title="1. Free trial">
        <p>
          Every account starts with a free trial of 30 days, and you do not need to give us a card. You are not charged
          during the trial, so there is nothing to refund. If you subscribe during the trial, the days you have left are kept
          and your first payment is taken only when the trial would have ended.
        </p>
      </LegalSection>

      <LegalSection title="2. Cancelling">
        <p>
          You can cancel your subscription at any time with “Cancel subscription” on your account page. You will not be charged
          again, and your business page stays public until the end of the period you have already paid for. Cancelling does
          not by itself refund the current period.
        </p>
      </LegalSection>

      <LegalSection title="3. Refunds">
        <p>
          <strong>You can ask for a refund within 14 days of any payment</strong>, for the monthly or the yearly plan, and for
          the first payment as well as a renewal. Tell us why if you like; you do not have to. We will refund the full amount
          of that payment.
        </p>
        <p>
          After 14 days we do not usually refund a payment, but you can still cancel at any time to stop the next one. Where
          the law of your country gives you a longer right to a refund, that right stays.
        </p>
      </LegalSection>

      <LegalSection title="4. How to ask">
        <LegalList>
          <li>
            Write to {LEGAL.email} from the email address of your account, and say which payment it is about.
          </li>
          <li>
            Or ask {LEGAL.paymentProvider}, our payment provider, directly: it sold you the plan and sent your invoice, and it
            has a page for buyers to ask for a refund.
          </li>
        </LegalList>
        <p>
          Payments are handled by {LEGAL.paymentProvider}, the Merchant of Record for our plans, so a refund is paid back by{" "}
          {LEGAL.paymentProvider} to the card or other method you paid with. It usually reaches you within 5 to 10 working
          days, depending on your bank. Taxes that were charged on the payment are refunded with it.
        </p>
      </LegalSection>

      <LegalSection title="5. After a refund">
        <p>
          When we refund a payment in full, we also end the subscription it was for. A partial refund (part of a payment) does not end the subscription. If a full refund ended your only paid plan, your business page, products and
          services are hidden from the public, not deleted, and they become public again when you subscribe. See section 6 of the{" "}
          <Link href="/terms" className="underline">
            Terms and Conditions
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="6. Contact">
        <p>
          {LEGAL.operator}, individual operator of sqrtx
          <br />
          {LEGAL.address}
          <br />
          Email: {LEGAL.email}
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
