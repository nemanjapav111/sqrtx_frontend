import type { Metadata } from "next";
import { asLocale } from "@/lib/i18n";
import { getDictionary } from "../../../dictionaries";
import BackLink from "../../back-link";
import ServiceEditStep from "../service-edit-step";

export async function generateMetadata({ params }: PageProps<"/[lang]/account/services/new">): Promise<Metadata> {
  const { lang } = await params;
  return { title: (await getDictionary(asLocale(lang))).account.services.edit.metaTitleNew };
}

// Adds a service after registration: the same form as the edit page, empty. (A static folder, so /account/services/new
// is never taken for a service whose id is "new".)
export default async function NewService({ params }: PageProps<"/[lang]/account/services/new">) {
  const { lang } = await params;
  const { edit } = (await getDictionary(asLocale(lang))).account.services;
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <BackLink href="/account/services" />
      <div className="flex w-full max-w-200 flex-col items-center">
        <ServiceEditStep id={null} text={edit} />
      </div>
    </main>
  );
}
