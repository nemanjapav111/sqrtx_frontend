import type { Metadata } from "next";
import { asLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import AccountStep from "./account-step";

export async function generateMetadata({ params }: PageProps<"/[lang]/account">): Promise<Metadata> {
  const { lang } = await params;
  return { title: (await getDictionary(asLocale(lang))).account.metaTitle };
}

// The account page: the login, whether the business page is public, and billing (free trial, plans, subscription).
// This is where a user lands after finishing registration and after logging in, and where the payment provider brings
// them back to after checkout (?checkout=success or ?checkout=cancelled). No design for this page yet: it follows the
// registration pages (same logo, widths and paddings), and all its wording is placeholder.
// The page itself is static (built once per language, no server work per visit): everything on it is loaded in the browser. What is built is
// AccountStep's loading state (the logo, the title and the grey placeholders), so that is what is on screen from the first moment,
// before the browser's code has loaded. Nothing in it reads the address while it is built (the ?checkout= value is read by the
// billing part, which only exists once the data has arrived), so it needs no Suspense.
export default async function Account({ params }: PageProps<"/[lang]/account">) {
  const { lang } = await params;
  const { account } = await getDictionary(asLocale(lang));
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <div className="flex w-full max-w-200 flex-col items-center">
        <AccountStep text={account} />
      </div>
    </main>
  );
}
