import { notFound, permanentRedirect } from "next/navigation";
import { asLocale, businessBase } from "@/lib/i18n";
import { idFromSegment, productSegment } from "@/lib/product-url";
import { getBusiness, getProduct } from "@/lib/public-site";
import ItemDetail from "../../item-detail/item-detail";
import { getDictionary } from "../../../dictionaries";

// A product's own page under its business's address (see page.tsx), shared by that page and by the overlay that opens it above the business's list
// (app/[lang]/[slug]/@modal/(.)product/[id]). `intercepted`: drawn in the overlay, where an old or bare address is not sent anywhere (the list behind must stay).
export async function BusinessProduct({ lang: langPart, slug, segment, intercepted = false }: { lang: string; slug: string; segment: string; intercepted?: boolean }) {
  const lang = asLocale(langPart);
  const id = idFromSegment(segment);
  if (!id) notFound();
  const business = await getBusiness(slug);
  if (!business) notFound();
  const product = await getProduct(id, business.user_id);
  if (!product || product.user_id !== business.user_id) notFound();
  // Any other form of the address (the bare id, an old name, other capitals) goes to the current one.
  const current = productSegment(product.product_name, product.id);
  if (segment !== current && !intercepted) permanentRedirect(`${businessBase(slug.toLowerCase(), lang)}/product/${current}`);
  const item = { name: product.product_name, price: product.price, description: product.description, images: product.images };
  const dictionary = await getDictionary(lang);
  return (
    <ItemDetail
      item={item}
      business={business}
      slug={slug.toLowerCase()}
      backTo={businessBase(slug.toLowerCase(), lang)}
      backLabel={dictionary.business.search.backToProducts}
      text={dictionary.item}
    />
  );
}
