import type { Metadata } from "next";
import { asLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import ResetForm from "./reset-form";

export async function generateMetadata({ params }: PageProps<"/[lang]/reset-password">): Promise<Metadata> {
  const { lang } = await params;
  return { title: (await getDictionary(asLocale(lang))).auth.reset.metaTitle };
}

export default async function ResetPassword({ params }: PageProps<"/[lang]/reset-password">) {
  const { lang } = await params;
  const { reset } = (await getDictionary(asLocale(lang))).auth;
  return (
    <main className="flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black">
      <div className="flex w-full max-w-200 flex-col items-center">
        <ResetForm text={reset} />
      </div>
    </main>
  );
}
