import type { Metadata } from "next";
import { asLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import FinalStep from "./final-step";

export async function generateMetadata({ params }: PageProps<"/[lang]/register/final">): Promise<Metadata> {
  const { lang } = await params;
  return { title: (await getDictionary(asLocale(lang))).registration.final.metaTitle };
}

// The last registration step (Figma node 1911:712). Back goes to whichever step precedes it for this user
// (company, products or services, depending on what the business offers) - see FinalStep.
// pt-17.5 matches the other registration pages (not this frame's own Figma padding, which is a symmetric 50px):
// keeping the logo at the same vertical position across every registration page matters more than matching
// this one frame's own number exactly.
export default async function Final({ params }: PageProps<"/[lang]/register/final">) {
  const { lang } = await params;
  const { final } = (await getDictionary(asLocale(lang))).registration;
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <div className="flex w-full max-w-200 flex-col items-center">
        <FinalStep text={final} />
      </div>
    </main>
  );
}
