import Link from "next/link";
import { lang as pageLang } from "next/root-params";
import BigLogo from "@/app/[lang]/components/big-logo";
import { asLocale } from "@/lib/i18n";
import { getDictionary } from "./dictionaries";

// Shown for any address that leads nowhere, including a business address that doesn't exist or isn't public (for
// example a business whose free trial ended). No design for it yet: the logo, one sentence and a link home.
export default async function NotFound() {
  const text = (await getDictionary(asLocale(await pageLang()))).notFound;
  return (
    <main className="flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black">
      {/* Next does not read a metadata export of a not-found page, so the title is set here (React puts it in the head). */}
      <title>{text.metaTitle}</title>
      <BigLogo />
      <h1 className="pt-9.5 pb-2 text-[20px] font-semibold">{text.title}</h1>
      <p className="px-5 pb-6 text-center">{text.text}</p>
      <Link href="/" className="flex h-11 items-center px-4 font-semibold underline">
        {text.home}
      </Link>
    </main>
  );
}
