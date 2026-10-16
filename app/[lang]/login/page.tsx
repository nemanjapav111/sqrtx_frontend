import type { Metadata } from "next";
import { asLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";
import LoginForm from "./login-form";

export async function generateMetadata({ params }: PageProps<"/[lang]/login">): Promise<Metadata> {
  const { lang } = await params;
  return { title: (await getDictionary(asLocale(lang))).auth.login.metaTitle };
}

export default async function Login({ params }: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  const { login } = (await getDictionary(asLocale(lang))).auth;
  return (
    <main className="page-in flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black">
      <div className="flex w-full max-w-200 flex-col items-center">
        <LoginForm text={login} />
      </div>
    </main>
  );
}
