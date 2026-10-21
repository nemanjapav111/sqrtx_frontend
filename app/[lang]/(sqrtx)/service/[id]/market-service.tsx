import { notFound, permanentRedirect } from "next/navigation";
import ItemDetail from "@/app/[lang]/[slug]/item-detail/item-detail";
import { CompanyLine } from "@/app/[lang]/components/company-line";
import { asLocale } from "@/lib/i18n";
import { idFromSegment, serviceSegment, slugOfCompanyUrl } from "@/lib/product-url";
import { getBusinessByUserId, getServiceAnywhere } from "@/lib/public-site";
import { getDictionary } from "../../../dictionaries";

// A service's own page in the sqrtx marketplace (see page.tsx), shared by that page and by the overlay that opens it above the Services list
// (app/[lang]/(sqrtx)/@modal/(.)service/[id]). `intercepted`: drawn in the overlay, where an old or bare address is not sent anywhere (the list behind must stay).
export async function MarketService({ lang, segment, intercepted = false }: { lang: string; segment: string; intercepted?: boolean }) {
  const id = idFromSegment(segment);
  if (!id) notFound();
  const service = await getServiceAnywhere(id);
  if (!service) notFound();
  const business = await getBusinessByUserId(service.user_id);
  const slug = business && slugOfCompanyUrl(business.company_url);
  if (!business || !slug) notFound();
  const current = serviceSegment(service.service_name, service.id);
  if (segment !== current && !intercepted) permanentRedirect(`/service/${current}`);

  const dictionary = await getDictionary(asLocale(lang));
  const item = {
    name: service.service_name,
    price: service.price,
    priceType: service.price_type,
    description: service.description,
    images: service.images,
    service: { duration: service.duration, area: service.service_area },
  };
  return (
    <ItemDetail
      item={item}
      business={business}
      slug={slug}
      backTo="/services"
      backLabel={dictionary.home.search.backToServices}
      text={dictionary.item}
      companyLine={<CompanyLine slug={slug} name={business.company_name} city={business.city} logo={business.logo} />}
    />
  );
}
