"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBusinessBase } from "@/app/[lang]/components/business-link";
import { previousPath, signalBack } from "./path-tracker";

// The arrow on a product's (or service's) page that leads back to its list. A link to the list (so it also works opened in a
// new tab), but when the visitor came FROM the list it goes back in the browser's history instead: with hundreds of
// products the list is then just as they left it (scroll position, search) instead of starting again at the top.
// `to` is the list's address (the products' list is the business's own address, the services' list may be too, see tabs.ts).
export default function BackToProducts({
  slug,
  className,
  children,
  to: toGiven,
  label,
}: {
  slug: string;
  className: string;
  children: React.ReactNode;
  to?: string;
  label: string;
}) {
  const router = useRouter();
  const base = useBusinessBase(slug);
  const to = toGiven ?? base;
  return (
    <Link
      href={to}
      aria-label={label}
      className={className}
      onClick={(event) => {
        if (previousPath() !== to) return; // not from the list: follow the link
        event.preventDefault();
        signalBack();
        router.back();
      }}
    >
      {children}
    </Link>
  );
}
