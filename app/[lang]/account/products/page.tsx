import type { Metadata } from "next";
import { asLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import BackLink from "../back-link";
import ProductsList from "./products-list";

export async function generateMetadata({ params }: PageProps<"/[lang]/account/products">): Promise<Metadata> {
  const { lang } = await params;
  return { title: (await getDictionary(asLocale(lang))).account.products.list.metaTitle };
}

// The owner's products: a list leading to each product's edit page. No design: it follows the account pages.
export default async function Products({ params }: PageProps<"/[lang]/account/products">) {
  const { lang } = await params;
  const { list } = (await getDictionary(asLocale(lang))).account.products;
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <BackLink href="/account" />
      <div className="flex w-full max-w-200 flex-col items-center">
        <ProductsList text={list} />
      </div>
    </main>
  );
}
