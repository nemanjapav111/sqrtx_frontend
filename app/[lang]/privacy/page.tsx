import LegalDocument, { LegalList, LegalSection } from "@/app/[lang]/components/legal-document";
import { LEGAL, LEGAL_LINKS, PRIVACY_VERSION } from "@/lib/legal";

export const metadata = { title: "Privacy Policy – sqrtx" };

// DRAFT: written from how sqrtx is built today (what it collects and which services it uses), for a lawyer to review.
// Anything only the owner can know is in LEGAL (lib/legal.ts) or in [square brackets] here. sqrtx is first tested by an
// individual with no registered company (sections 1 and 13 say so); when a company takes over, see the note above LEGAL.
// When the text changes, raise PRIVACY_VERSION (lib/legal.ts) and CURRENT_PRIVACY_VERSION in the backend together.
// KEEP SECTIONS 2, 3, 5 AND 9 TRUE whenever the app starts collecting something new, or starts using another company to
// process data.
export default function Privacy() {
  return (
    <LegalDocument title="Privacy Policy" version={PRIVACY_VERSION} updated="October 22, 2026" draft={false} other={LEGAL_LINKS.filter((link) => link.href !== "/privacy")}>
      <LegalSection title="1. Who we are">
        <p>
          This policy explains how {LEGAL.operator}, an individual operating the sqrtx service (“sqrtx”, “we”, “us”),
          handles personal data when you use sqrtx. We decide why and how your data is used. You can reach us at{" "}
          {LEGAL.email}.
        </p>
        <p>
          sqrtx is currently run by an individual and not by a registered company. If a company takes over sqrtx, that company
          becomes responsible for your data and we will tell you (see section 5 and the Terms and Conditions).
        </p>
      </LegalSection>

      <LegalSection title="2. What we collect">
        <LegalList>
          <li>
            <strong>Your account:</strong> your login email and your password. Your password is stored only in scrambled form
            by our login provider; we cannot read it.
          </li>
          <li>
            <strong>Your business page:</strong> company name, business category, address and its position on the map, contact
            email, phone, opening hours, Facebook and Instagram links, your page address, your logo, and the text about your
            company.
          </li>
          <li>
            <strong>Your products and services:</strong> names, descriptions, prices, categories and photos.
          </li>
          <li>
            <strong>Your plan:</strong> when your free trial started and ends, and, if you subscribe, which plan you chose, its
            status, how long it is paid for, whether you cancelled it, and the customer and subscription numbers our payment
            provider gave you. Payments are taken by our payment provider (section 5). We never see or store your card details.
          </li>
          <li>
            <strong>Messages to a business:</strong> when a visitor uses the contact form on a business page, we receive the
            visitor’s name, email address and message and send them by email to the business, so that it can answer. We do not
            keep them in sqrtx’s database.
          </li>
          <li>
            <strong>Searches:</strong> what visitors type in the search and which results they get may be recorded in our server
            logs, without the visitor’s name. When a visitor searches with a photo, the photo is turned into a list of numbers to
            find similar products and services. Only those numbers are kept, for about 15 minutes, and never the picture itself.
          </li>
          <li>
            <strong>Your language:</strong> the language you choose for the site.
          </li>
          <li>
            <strong>Your agreement:</strong> when you accepted our terms and this policy, and which versions.
          </li>
          <li>
            <strong>Technical data:</strong> our providers may record things such as your IP address, browser type and the
            times you sign in, to keep the service secure and running. Our server logs may keep your IP address for security
            and troubleshooting.
          </li>
          <li>
            <strong>Emails:</strong> we send you emails needed for the service, such as confirming your email address and
            resetting your password.
          </li>
        </LegalList>
        <p>Some of this can be about a person (for example a sole trader’s name or phone number).</p>
      </LegalSection>

      <LegalSection title="3. What is public">
        <p>
          Once you finish registration, your business page is public, and so are your products and services. Anyone can see
          your company name, category, address, contact email and phone (if you give them), opening hours, links, page address,
          logo, text about your company, and your products, services, prices and photos.
        </p>
        <p>
          Your login email, your password and the record of what you accepted are not public. Please do not put personal
          details in public fields if you do not want them shown.
        </p>
      </LegalSection>

      <LegalSection title="4. Why we use your data">
        <LegalList>
          <li>To create and run your account and show your business page (to carry out our agreement with you).</li>
          <li>To send emails the service needs (to carry out our agreement with you).</li>
          <li>To help visitors find businesses, for example through search (our interest in running a useful directory).</li>
          <li>To keep sqrtx secure, prevent misuse and fix problems (our interest in a safe service).</li>
          <li>To keep records of what you accepted, and to meet legal duties (legal obligation, and our interest in proving what was agreed).</li>
        </LegalList>
        <p>We do not sell your personal data.</p>
      </LegalSection>

      <LegalSection title="5. Who else handles your data">
        <p>We use other companies to run sqrtx. They handle data only to provide their service to us:</p>
        <LegalList>
          <li>our login and database provider (Supabase), which stores accounts and the information you give us;</li>
          <li>
            our network, security and image storage provider (Cloudflare), which delivers sqrtx to visitors, protects it against
            attacks and automated abuse, measures visits without using cookies, and stores your logo and photos;
          </li>
          <li>
            Google, whose address search suggests addresses as you type. What you type in the address box is sent to Google.
            Google’s own privacy policy applies to that;
          </li>
          <li>
            our payment provider, {LEGAL.paymentProvider}, the Merchant of Record for our plans, which takes your payments,
            holds your card details and handles taxes and invoices. It receives your name, email and billing details, works out your country from your internet address to show the right price
            and tax, and tells us whether your subscription is active. {LEGAL.paymentProvider} is responsible for that data under its own privacy
            policy;
          </li>
          <li>
            our email delivery provider, Brevo, which sends emails for the service, including the messages visitors write to a
            business through its contact form;
          </li>
          <li>
            our business email provider, Namecheap (Private Email), which hosts the mailbox where messages sent to {LEGAL.email}{" "}
            arrive and from which we answer them;
          </li>
          <li>
            our hosting provider, OVHcloud, which runs the server that hosts sqrtx, in the United States (Virginia).
          </li>
        </LegalList>
        <p>
          We may also share data if the law or a public authority requires it, or with a company that takes over sqrtx, if
          that happens. We will tell you first where the law requires it.
        </p>
      </LegalSection>

      <LegalSection title="6. Data sent to other countries">
        <p>
          Our providers may store or handle data in other countries, including outside your own. Where the law requires it, we
          make sure the data stays protected, for example with standard contract terms. Our database, which holds your account and
          the content of your business page, is stored in the United States (US East), and our servers run in the United States (Virginia).
        </p>
      </LegalSection>

      <LegalSection title="7. How long we keep it">
        <p>
          We keep your data while your account is open. When you delete your account, your business page, products, services
          and photos are removed from public view, and we delete the data within 30 days, except copies in backups, which
          are deleted within 7 days. The record of what you accepted is part of
          your account and is deleted with it. We may keep anything the law requires us to keep, for as long as the law requires.
        </p>
      </LegalSection>

      <LegalSection title="8. Your rights">
        <p>Depending on where you live, you may have the right to:</p>
        <LegalList>
          <li>see the data we hold about you, and get a copy;</li>
          <li>correct data that is wrong, or delete it;</li>
          <li>limit how we use it, or object to some uses;</li>
          <li>take your data to another service, where it is technically possible;</li>
          <li>
            complain to your data protection authority. In Serbia this is the{" "}
            <a href="https://www.poverenik.rs/en/" target="_blank" rel="noopener noreferrer" className="underline">
              Commissioner for Information of Public Importance and Personal Data Protection
            </a>
            .
          </li>
        </LegalList>
        <p>To use these rights, write to {LEGAL.email}. We will answer within the time the law sets.</p>
      </LegalSection>

      <LegalSection title="9. Cookies and browser storage">
        <p>
          sqrtx keeps your login in your browser so that you stay signed in, and remembers your language, your country filter and
          a few settings of the page you are on (for example a search you typed in your account). This is needed for the service to
          work and is kept in your browser. We do not use advertising or tracking cookies. Google’s address search and our payment
          provider’s checkout are loaded from those companies and may store their own data as described in their policies. The visit
          statistics of our network provider work without cookies.
        </p>
      </LegalSection>

      <LegalSection title="10. Security">
        <p>
          We use reasonable technical and organisational measures to protect your data, such as encrypted connections and
          scrambled passwords. No service is completely secure, so we cannot promise absolute security.
        </p>
      </LegalSection>

      <LegalSection title="11. Children">
        <p>sqrtx is for people who are at least 18. We do not knowingly collect data from anyone younger.</p>
      </LegalSection>

      <LegalSection title="12. Changes to this policy">
        <p>
          We may update this policy. If the change is important we will tell you by email or on the site, and we may ask you to
          accept the new version. The date at the top shows when it was last changed.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact">
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
