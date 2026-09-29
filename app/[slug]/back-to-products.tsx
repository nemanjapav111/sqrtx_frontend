"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { previousPath } from "./path-tracker";

// The arrow on a product's page that leads back to the list of products. A link to the list (so it also works opened in a
// new tab), but when the visitor came FROM the list it goes back in the browser's history instead: with hundreds of
// products the list is then just as they left it (scroll position, search) instead of starting again at the top.
export default function BackToProducts({ slug, className, children }: { slug: string; className: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <Link
      href={`/${slug}`}
      aria-label="Back to products"
      className={className}
      onClick={(event) => {
        if (previousPath() !== `/${slug}`) return; // not from the list: follow the link
        event.preventDefault();
        router.back();
      }}
    >
      {children}
    </Link>
  );
}
