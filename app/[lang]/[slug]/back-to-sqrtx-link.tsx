"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { previousPath } from "./path-tracker";

// The way back to sqrtx on a business's page ("← sqrtx"). A link to the marketplace's home (so it also works opened in a new tab), but when the visitor came
// to this business FROM a page of the marketplace (a product's page, the services, the companies, the home list), it goes back in the browser's history instead:
// they land on that page again, where they clicked, scrolled as they left it, not at the top of the home page. Same idea as back-to-products.tsx.
// Only when the page just before this one was a marketplace page (path-tracker.tsx): after moving around inside the business's own site the link goes to the home page.
const MARKETPLACE = [/^\/$/, /^\/product(\/|$)/, /^\/service(\/|$)/, /^\/services(\/|$)/, /^\/companies(\/|$)/, /^\/about(\/|$)/];

export default function BackToSqrtxLink({ className, ariaLabel, children }: { className: string; ariaLabel?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <Link
      href="/"
      aria-label={ariaLabel}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return; // opening in a new tab: follow the link
        const from = previousPath();
        if (!from || !MARKETPLACE.some((page) => page.test(from))) return; // not from the marketplace: follow the link
        event.preventDefault();
        router.back();
      }}
    >
      {children}
    </Link>
  );
}
