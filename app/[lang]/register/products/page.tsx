import type { Metadata } from "next";
import Link from "next/link";
import { asLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import ArrowIcon from "../arrow-icon";
import ProductsStep from "./products-step";

export async function generateMetadata({ params }: PageProps<"/[lang]/register/products">): Promise<Metadata> {
  const { lang } = await params;
  return { title: (await getDictionary(asLocale(lang))).registration.products.metaTitle };
}

// Registration step 2 (only for businesses that offer products). Back goes to the business profile.
export default async function Products({ params }: PageProps<"/[lang]/register/products">) {
  const { lang } = await params;
  const dictionary = await getDictionary(asLocale(lang));
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <Link href="/register/company" aria-label={dictionary.common.back} className="absolute top-0.75 left-1.5 px-2.5 py-2 md:left-[calc(50%-260px)]">
        <ArrowIcon className="h-7 w-6 rotate-180" />
      </Link>
      <div className="flex w-full max-w-200 flex-col items-center">
        <ProductsStep text={dictionary.registration.products} />
      </div>
    </main>
  );
}
