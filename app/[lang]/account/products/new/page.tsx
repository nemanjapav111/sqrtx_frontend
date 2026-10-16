import type { Metadata } from "next";
import { asLocale } from "@/lib/i18n";
import { getDictionary } from "../../../dictionaries";
import BackLink from "../../back-link";
import ProductEditStep from "../product-edit-step";

export async function generateMetadata({ params }: PageProps<"/[lang]/account/products/new">): Promise<Metadata> {
  const { lang } = await params;
  return { title: (await getDictionary(asLocale(lang))).account.products.edit.metaTitleNew };
}

// Adds a product after registration: the same form as the edit page, empty. (A static folder, so /account/products/new
// is never taken for a product whose id is "new".)
export default async function NewProduct({ params }: PageProps<"/[lang]/account/products/new">) {
  const { lang } = await params;
  const { edit } = (await getDictionary(asLocale(lang))).account.products;
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <BackLink href="/account/products" />
      <div className="flex w-full max-w-200 flex-col items-center">
        <ProductEditStep id={null} text={edit} />
      </div>
    </main>
  );
}
