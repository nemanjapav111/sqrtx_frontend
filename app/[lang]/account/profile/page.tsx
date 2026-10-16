import type { Metadata } from "next";
import CompanyStep from "@/app/[lang]/register/company/company-step";
import { loadCategoryTable } from "@/lib/category-tables";
import { asLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import BackLink from "../back-link";

export async function generateMetadata({ params }: PageProps<"/[lang]/account/profile">): Promise<Metadata> {
  const { lang } = await params;
  return { title: (await getDictionary(asLocale(lang))).registration.company.metaTitleAccount };
}

// The owner editing their business profile after registration: the registration's first page (same fields, checks and
// address search), filled with what is saved. No design of its own: only the title and the button differ.
export default async function Profile({ params }: PageProps<"/[lang]/account/profile">) {
  const { lang } = await params;
  const { company } = (await getDictionary(asLocale(lang))).registration;
  const categoryTable = await loadCategoryTable(asLocale(lang));
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <BackLink href="/account" />
      <div className="flex w-full max-w-200 flex-col items-center">
        <CompanyStep text={company} categoryTable={categoryTable} variant="account" />
      </div>
    </main>
  );
}
