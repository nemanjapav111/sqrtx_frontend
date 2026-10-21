import { notFound, permanentRedirect } from "next/navigation";
import { asLocale, businessBase } from "@/lib/i18n";
import { idFromSegment, serviceSegment } from "@/lib/product-url";
import { getBusiness, getService } from "@/lib/public-site";
import ItemDetail from "../../item-detail/item-detail";
import { getDictionary } from "../../../dictionaries";
import { tabPath } from "../../tabs";

// A service's own page under its business's address (see page.tsx), shared by that page and by the overlay that opens it above the business's list
// (app/[lang]/[slug]/@modal/(.)service/[id]). `intercepted`: drawn in the overlay, where an old or bare address is not sent anywhere (the list behind must stay).
export async function BusinessService({ lang: langPart, slug, segment, intercepted = false }: { lang: string; slug: string; segment: string; intercepted?: boolean }) {
  const lang = asLocale(langPart);
  const id = idFromSegment(segment);
  if (!id) notFound();
  const business = await getBusiness(slug);
  if (!business) notFound();
  const service = await getService(id, business.user_id);
  if (!service || service.user_id !== business.user_id) notFound();
  // Any other form of the address (the bare id, an old name, other capitals) goes to the current one.
  const current = serviceSegment(service.service_name, service.id);
  if (segment !== current && !intercepted) permanentRedirect(`${businessBase(slug.toLowerCase(), lang)}/service/${current}`);
  const item = {
    name: service.service_name,
    price: service.price,
    priceType: service.price_type,
    description: service.description,
    images: service.images,
    service: { duration: service.duration, area: service.service_area },
  };
  const dictionary = await getDictionary(lang);
  return (
    <ItemDetail
      item={item}
      business={business}
      slug={slug.toLowerCase()}
      backTo={tabPath(slug, business.provides, "services", lang)}
      backLabel={dictionary.business.search.backToServices}
      text={dictionary.item}
    />
  );
}
