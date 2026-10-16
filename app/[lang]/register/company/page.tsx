import type { Metadata } from "next";
import LogoutButton from "@/app/[lang]/components/logout-button";
import { loadCategoryTable } from "@/lib/category-tables";
import { asLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import CompanyStep from "./company-step";

export async function generateMetadata({ params }: PageProps<"/[lang]/register/company">): Promise<Metadata> {
  const { lang } = await params;
  return { title: (await getDictionary(asLocale(lang))).registration.company.metaTitle };
}

// Registration step 1. This is also where the link in the confirmation email brings the user.
// No Back arrow: nothing comes before this step (the account is already made and the email confirmed), and the
// logo above the form already links to the landing page.
export default async function Company({ params }: PageProps<"/[lang]/register/company">) {
  const { lang } = await params;
  const { company } = (await getDictionary(asLocale(lang))).registration;
  const categoryTable = await loadCategoryTable(asLocale(lang));
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <div className="absolute top-0.75 right-3 md:right-[calc(50%-262px)]">
        <LogoutButton />
      </div>
      <div className="flex w-full max-w-200 flex-col items-center">
        <CompanyStep text={company} categoryTable={categoryTable} />
      </div>
    </main>
  );
}
