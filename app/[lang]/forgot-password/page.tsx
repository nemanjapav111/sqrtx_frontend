import type { Metadata } from "next";
import { asLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import ForgotForm from "./forgot-form";

export async function generateMetadata({ params }: PageProps<"/[lang]/forgot-password">): Promise<Metadata> {
  const { lang } = await params;
  return { title: (await getDictionary(asLocale(lang))).auth.forgot.metaTitle };
}

export default async function ForgotPassword({ params }: PageProps<"/[lang]/forgot-password">) {
  const { lang } = await params;
  const { forgot } = (await getDictionary(asLocale(lang))).auth;
  return (
    <main className="flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black">
      <div className="flex w-full max-w-200 flex-col items-center">
        <ForgotForm text={forgot} />
      </div>
    </main>
  );
}
