import { ItemLoading } from "@/app/[lang]/[slug]/item-detail/item-loading";
import ItemOverlay from "@/app/[lang]/components/item-overlay";

export default function Loading() {
  return (
    <ItemOverlay>
      <ItemLoading companyLine />
    </ItemOverlay>
  );
}
