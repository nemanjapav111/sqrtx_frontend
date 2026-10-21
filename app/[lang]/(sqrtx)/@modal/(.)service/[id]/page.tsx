import ItemOverlay from "@/app/[lang]/components/item-overlay";
import { MarketService } from "../../../service/[id]/market-service";

// The tab's title and description while the service is open above the list: the page's own.
export { generateMetadata } from "../../../service/[id]/page";

// A service opened from a list of the marketplace: the same page as service/[id]/page.tsx, drawn above the list (see components/item-overlay.tsx).
export default async function InterceptedService({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  return (
    <ItemOverlay>
      <MarketService lang={lang} segment={id} intercepted />
    </ItemOverlay>
  );
}
