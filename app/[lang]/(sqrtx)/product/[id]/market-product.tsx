import { notFound, permanentRedirect } from "next/navigation";
import ItemDetail from "@/app/[lang]/[slug]/item-detail/item-detail";
import { CompanyLine } from "@/app/[lang]/components/company-line";
import { asLocale } from "@/lib/i18n";
import { idFromSegment, productSegment, slugOfCompanyUrl } from "@/lib/product-url";
import { getBusinessByUserId, getProductAnywhere } from "@/lib/public-site";
import { getDictionary } from "../../../dictionaries";

// A product's own page in the sqrtx marketplace (see page.tsx), shared by that page and by the overlay that opens it above the home list
// (app/[lang]/(sqrtx)/@modal/(.)product/[id]). `intercepted`: drawn in the overlay, where an old or bare address is not sent anywhere (the list behind must stay).
export async function MarketProduct({ lang, segment, intercepted = false }: { lang: string; segment: string; intercepted?: boolean }) {
  const id = idFromSegment(segment);
  if (!id) notFound();
  const product = await getProductAnywhere(id);
  if (!product) notFound();
  const business = await getBusinessByUserId(product.user_id); // 404 for a business the public can't see
  const slug = business && slugOfCompanyUrl(business.company_url);
  if (!business || !slug) notFound();
  const current = productSegment(product.product_name, product.id);
  if (segment !== current && !intercepted) permanentRedirect(`/product/${current}`);

  const dictionary = await getDictionary(asLocale(lang));
  const item = { name: product.product_name, price: product.price, description: product.description, images: product.images };
  return (
    <ItemDetail
      item={item}
      business={business}
      slug={slug}
      backTo="/"
      backLabel={dictionary.home.search.backToProducts}
      text={dictionary.item}
      companyLine={<CompanyLine slug={slug} name={business.company_name} city={business.city} logo={business.logo} />}
    />
  );
}
