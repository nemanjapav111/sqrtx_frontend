import ItemOverlay from "@/app/[lang]/components/item-overlay";
import { MarketProduct } from "../../../product/[id]/market-product";

// The tab's title and description while the product is open above the list: the page's own.
export { generateMetadata } from "../../../product/[id]/page";

// A product opened from a list of the marketplace: the same page as product/[id]/page.tsx, drawn above the list (see components/item-overlay.tsx).
export default async function InterceptedProduct({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  return (
    <ItemOverlay>
      <MarketProduct lang={lang} segment={id} intercepted />
    </ItemOverlay>
  );
}
