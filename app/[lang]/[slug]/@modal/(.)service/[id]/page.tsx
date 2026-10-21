import ItemOverlay from "@/app/[lang]/components/item-overlay";
import { BusinessService } from "../../../service/[id]/business-service";

// The tab's title and description while the service is open above the list: the page's own.
export { generateMetadata } from "../../../service/[id]/page";

// A service opened from a list of a business's site: the same page as service/[id]/page.tsx, drawn above the list (see components/item-overlay.tsx).
export default async function InterceptedService({ params }: { params: Promise<{ lang: string; slug: string; id: string }> }) {
  const { lang, slug, id } = await params;
  return (
    <ItemOverlay>
      <BusinessService lang={lang} slug={slug} segment={id} intercepted />
    </ItemOverlay>
  );
}
