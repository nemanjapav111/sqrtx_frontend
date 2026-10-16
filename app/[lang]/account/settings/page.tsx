import type { Metadata } from "next";
import { asLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import BackButton from "./back-button";
import SettingsStep from "./settings-step";

export async function generateMetadata({ params }: PageProps<"/[lang]/account/settings">): Promise<Metadata> {
  const { lang } = await params;
  return { title: (await getDictionary(asLocale(lang))).account.settings.metaTitle };
}

// Account settings: change the login email and the password. The confirmation link Supabase emails for an email
// change brings the user back here. No design for this page as a whole (only the "Change login email" form has one,
// Figma 1005:97): it follows the registration pages, and the rest of its wording is placeholder.
export default async function Settings({ params }: PageProps<"/[lang]/account/settings">) {
  const { lang } = await params;
  const { settings } = (await getDictionary(asLocale(lang))).account;
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <BackButton />
      <div className="flex w-full max-w-200 flex-col items-center">
        <SettingsStep text={settings} />
      </div>
    </main>
  );
}
