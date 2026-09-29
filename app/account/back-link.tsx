import Link from "next/link";
import ArrowIcon from "@/app/register/arrow-icon";

// The back arrow of the owner's pages that sit one level under another: always goes UP to that page, whatever the user
// did before (unlike back-button.tsx in settings, which goes back in the browser's history because Settings can be
// reached from two places). Here the page above is always the same, and going by history would send someone who just
// saved a product back into the edit page they came from. Same look and place as the other back arrows.
export default function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} aria-label="Back" className="absolute top-0.75 left-1.5 px-2.5 py-2 md:left-[calc(50%-260px)]">
      <ArrowIcon className="h-7 w-6 rotate-180" />
    </Link>
  );
}
