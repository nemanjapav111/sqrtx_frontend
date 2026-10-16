import type { Metadata } from "next";
import { asLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import ServicesStep from "./services-step";

export async function generateMetadata({ params }: PageProps<"/[lang]/register/services">): Promise<Metadata> {
  const { lang } = await params;
  return { title: (await getDictionary(asLocale(lang))).registration.services.metaTitle };
}

// Registration step (only for businesses that offer services). Back goes to whichever step precedes it for this
// user: /register/products if they have one, otherwise /register/company (see ServicesStep).
export default async function Services({ params }: PageProps<"/[lang]/register/services">) {
  const { lang } = await params;
  const { services } = (await getDictionary(asLocale(lang))).registration;
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <div className="flex w-full max-w-200 flex-col items-center">
        <ServicesStep text={services} />
      </div>
    </main>
  );
}
