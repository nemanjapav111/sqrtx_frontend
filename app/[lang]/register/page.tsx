import type { Metadata } from "next";
import { asLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import RegisterFlow from "./register-flow";

export async function generateMetadata({ params }: PageProps<"/[lang]/register">): Promise<Metadata> {
  const { lang } = await params;
  return { title: (await getDictionary(asLocale(lang))).auth.register.metaTitle };
}

export default async function Register({ params }: PageProps<"/[lang]/register">) {
  const { lang } = await params;
  const { register, verify } = (await getDictionary(asLocale(lang))).auth;
  return (
    <main className="page-in flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black">
      <div className="flex w-full max-w-200 flex-col items-center">
        <RegisterFlow text={register} verifyText={verify} />
      </div>
    </main>
  );
}
