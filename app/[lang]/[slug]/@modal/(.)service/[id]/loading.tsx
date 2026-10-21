import ItemOverlay from "@/app/[lang]/components/item-overlay";
import { ItemLoading } from "../../../item-detail/item-loading";

export default function Loading() {
  return (
    <ItemOverlay>
      <ItemLoading />
    </ItemOverlay>
  );
}
