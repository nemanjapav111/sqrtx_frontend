import type { Metadata } from "next";
import { asLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import BackLink from "../back-link";
import ServicesList from "./services-list";

export async function generateMetadata({ params }: PageProps<"/[lang]/account/services">): Promise<Metadata> {
  const { lang } = await params;
  return { title: (await getDictionary(asLocale(lang))).account.services.list.metaTitle };
}

// The owner's services: a list leading to each service's edit page. No design: it follows the account pages.
export default async function Services({ params }: PageProps<"/[lang]/account/services">) {
  const { lang } = await params;
  const { list } = (await getDictionary(asLocale(lang))).account.services;
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <BackLink href="/account" />
      <div className="flex w-full max-w-200 flex-col items-center">
        <ServicesList text={list} />
      </div>
    </main>
  );
}
