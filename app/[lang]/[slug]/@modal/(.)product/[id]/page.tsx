import ItemOverlay from "@/app/[lang]/components/item-overlay";
import { BusinessProduct } from "../../../product/[id]/business-product";

// The tab's title and description while the product is open above the list: the page's own.
export { generateMetadata } from "../../../product/[id]/page";

// Built on the first visit and kept, like the page itself (no address is built ahead of time): without this every open of a product built it again.
export function generateStaticParams() {
  return [];
}

// A product opened from a list of a business's site: the same page as product/[id]/page.tsx, drawn above the list (see components/item-overlay.tsx).
export default async function InterceptedProduct({ params }: { params: Promise<{ lang: string; slug: string; id: string }> }) {
  const { lang, slug, id } = await params;
  return (
    <ItemOverlay>
      <BusinessProduct lang={lang} slug={slug} segment={id} intercepted />
    </ItemOverlay>
  );
}
