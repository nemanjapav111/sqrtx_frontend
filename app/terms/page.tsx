import LegalDocument, { LegalList, LegalSection } from "@/app/components/legal-document";
import { LEGAL, TERMS_VERSION } from "@/lib/legal";

export const metadata = { title: "Terms and Conditions – sqrtx" };

// DRAFT for a lawyer to review. It started as Claude's outline, was revised by the owner, and has been checked against
// how sqrtx works today. Anything only the owner can know is in LEGAL (lib/legal.ts) or in [square brackets] here.
// sqrtx is first tested by an individual with no registered company (sections 1, 8, 12 and 14 say so); when a company
// takes over, see the note above LEGAL. When the text changes, raise TERMS_VERSION (lib/legal.ts) and
// CURRENT_TERMS_VERSION in the backend together. Keep section 6 true once billing exists.
export default function Terms() {
  return (
    <LegalDocument title="Terms and Conditions" version={TERMS_VERSION} other={{ href: "/privacy", label: "Privacy Policy" }}>
      <LegalSection title="1. About these terms">
        <p>
          These terms are an agreement between you and {LEGAL.operator}, an individual operating the sqrtx service (“sqrtx”,
          “we”, “us”). They apply to your use of the sqrtx website and service, where businesses create a public page and list
          their products and services.
        </p>
        <p>
          sqrtx is currently run by an individual and not by a registered company. Before paid plans begin, the operator and
          the other details in these terms will be updated as required (see section 12).
        </p>
        <p>
          By ticking the box when you finish registration, or by using sqrtx, you accept these terms and our Privacy Policy.
          If you do not agree, please do not use sqrtx.
        </p>
      </LegalSection>

      <LegalSection title="2. Who can use sqrtx">
        <p>
          You must be at least 18 years old and able to make a binding agreement. If you sign up for a business, you confirm
          that you are allowed to act for that business and to accept these terms for it.
        </p>
      </LegalSection>

      <LegalSection title="3. Your account">
        <LegalList>
          <li>Give correct information, and keep it up to date.</li>
          <li>You need to confirm your email address before you can use your account.</li>
          <li>Keep your password secret. You are responsible for everything that happens under your account.</li>
          <li>Tell us straight away if you think someone else has used your account.</li>
          <li>One account has one business page.</li>
          <li>You may not hand over or sell your account to someone else without our written permission.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. Your business page and content">
        <p>
          “Your Content” means everything you add to sqrtx: your business name, category, address, contact details, opening
          hours, links, logo, text about your business, and your products and services with their descriptions, prices and
          photos.
        </p>
        <p>
          <strong>It is public.</strong> Once you finish registration, your business page, products and services can be seen by
          anyone, without logging in. Do not add anything you do not want the public to see.
        </p>
        <p>
          <strong>It stays yours.</strong> You keep all rights in Your Content. You give us a free, worldwide, non-exclusive
          licence to store, copy, resize, convert (for example to other image formats), show and distribute Your Content on
          sqrtx, so that we can run the service and show your business to visitors. This licence lasts while Your Content is
          on sqrtx, and for a short time afterwards while it is removed from our systems and backups.
        </p>
        <p>You promise that:</p>
        <LegalList>
          <li>what you publish is true, and not misleading, including prices and descriptions;</li>
          <li>you own Your Content or have the right to use it, including photos, logos and names;</li>
          <li>Your Content does not break the law or anyone else’s rights, including copyright and trademarks.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="5. What is not allowed">
        <p>You may not use sqrtx to:</p>
        <LegalList>
          <li>offer or promote anything illegal, or anything fraudulent or deceptive;</li>
          <li>publish content that is unlawful, hateful, threatening, sexually explicit or that infringes someone’s rights;</li>
          <li>pretend to be another person or business;</li>
          <li>upload viruses or other harmful code, or try to break into or overload the service;</li>
          <li>collect data about other users or businesses in bulk (for example by scraping) without our written permission;</li>
          <li>get around our security or limits, or use the service in a way that harms others or sqrtx.</li>
        </LegalList>
        <p>
          <strong>Reporting content.</strong> Anyone can report content on sqrtx that is illegal or that infringes their
          rights. Write to {LEGAL.email} with a link to the page and a short description of the problem. We will look at it
          and may remove the content.
        </p>
      </LegalSection>

      <LegalSection title="6. Free trial and payments">
        <p>
          <strong>Free trial.</strong> Every account gets a free trial of 30 days. It starts when you finish registration.
          You do not need to give us a card, and you will not be charged during the trial.
        </p>
        <p>
          <strong>Paid plans.</strong> To keep your business page public after the trial, you need a paid plan. The plans are
          $11.10 per month or $111 per year, per account [confirm whether taxes are included]. You can choose a plan before the
          trial ends or at any time after it. We will not charge you unless you have chosen a plan.
        </p>
        <p>
          <strong>When the trial ends.</strong> If you do not have a paid plan when the trial ends, your business page,
          products and services are hidden from the public. They are not deleted, and they become public again when you
          subscribe.
        </p>
        <p>
          <strong>How you pay.</strong> Payments are handled by [payment provider name]. We do not see or store your card
          details.
        </p>
        <p>
          [To be confirmed before launch: that plans renew automatically until cancelled, how to cancel and whether access
          continues until the end of the paid period, the refund policy, and how much notice we give before a price change.]
        </p>
      </LegalSection>

      <LegalSection title="7. Our role">
        <p>
          sqrtx is a place where businesses present themselves. We do not check or guarantee the businesses, products or
          services listed, and we are not part of any deal between a business and its customers.
        </p>
        <p>
          Any purchase, service agreement or other transaction between a business and its customer is between those parties.
          We do not promise that you will get customers, sales, enquiries or any particular result from using sqrtx.
        </p>
      </LegalSection>

      <LegalSection title="8. The service as it is">
        <p>
          We work to keep sqrtx running and secure, but we provide it “as is” and “as available”. It may be unavailable at
          times, for example for maintenance, technical problems or circumstances outside our reasonable control, and features
          may change or be removed.
        </p>
        <p>
          <strong>sqrtx is currently a test version.</strong> While it is being tested, accounts, content and other data may
          be changed, reset or deleted, features may change or stop working, and we cannot promise that nothing will be lost.
          Please keep your own copy of anything important.
        </p>
      </LegalSection>

      <LegalSection title="9. Limits on our responsibility">
        <p>
          To the extent the law allows, we are not responsible for indirect or consequential losses, such as lost profit, lost
          business or lost data.
        </p>
        <p>
          Our total responsibility to you for anything connected with sqrtx is limited to the amount you paid us for sqrtx in
          the 12 months before the claim, or to [a small fixed amount, for example 100 euros] if you paid nothing, to the extent
          such a limitation is permitted by law.
        </p>
        <p>
          Nothing in these terms limits responsibility that cannot be limited by law, or removes rights that you cannot legally
          waive, including any mandatory consumer rights that apply to you.
        </p>
      </LegalSection>

      <LegalSection title="10. Ending your account">
        <p>
          You can stop using sqrtx at any time and ask us to delete your account by writing to {LEGAL.email}.
        </p>
        <p>
          When your account is deleted, your business page, products and services are removed from public view, subject to any
          information we are legally required or legitimately entitled to retain.
        </p>
        <p>
          We may suspend or close an account, or remove content, if you break these terms, if we are required to do so by law,
          or if your use puts sqrtx or others at risk. Where we reasonably can, we will tell you why.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to these terms">
        <p>
          We may change these terms, for example when the service changes or when necessary to address legal or security
          requirements.
        </p>
        <p>
          If a change is important, we will tell you by email or on the site before it applies where reasonably possible, and
          we may ask you to accept the new version.
        </p>
        <p>
          If you keep using sqrtx after the updated terms take effect, you accept the updated terms to the extent permitted by
          law. If you do not agree, you can close your account.
        </p>
      </LegalSection>

      <LegalSection title="12. Moving sqrtx to a company">
        <p>
          We may hand over sqrtx, together with these terms and everything we owe and are owed under them, to another person
          or company that takes over running it, for example a company set up for that purpose. If we do, we will tell you by
          email or on the site, and the new operator takes our place in these terms and in the Privacy Policy.
        </p>
        <p>This does not take away any rights you have under these terms or under the law.</p>
      </LegalSection>

      <LegalSection title="13. Law and disputes">
        <p>
          These terms are governed by the laws of the Republic of Serbia, except to the extent that mandatory laws of the
          country where you live or operate give you rights that cannot legally be excluded or limited by these terms.
        </p>
        <p>Any dispute will be handled by the courts that have jurisdiction under applicable law.</p>
      </LegalSection>

      <LegalSection title="14. Contact">
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
