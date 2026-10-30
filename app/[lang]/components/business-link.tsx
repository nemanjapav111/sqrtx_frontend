"use client";

import Link from "next/link";
import { useCommonText, useLang } from "@/app/[lang]/components/lang-context";
import { businessBase, fill } from "@/lib/i18n";

// The start of a business's addresses in the language of the page you are on: /vega in English, /sr/vega in Serbian (lib/i18n.ts says why).
export const useBusinessBase = (slug: string) => businessBase(slug, useLang());

// A link to a business's page, in the language of the page you are on: the marketplace's cards and rows lead to /sr/<business> for a visitor who reads Serbian.
// `named`: the business's name, for a link that is a whole card or row: its label for screen readers is then "<name>: all its products and services".
// The owner's way to their OWN page ("View my page"): a plain link, so the browser loads the page again from the site instead of the client router showing a copy
// it kept (the page prefetched while the account page was open, from before the owner switched products or services on or off: the top bar and the bottom bar then
// still listed Products, services appeared under Products and the links led nowhere until the page was reloaded). Not prefetched either, for the same reason.
export function OwnBusinessLink({ slug, ...props }: { slug: string } & Omit<React.ComponentProps<"a">, "href">) {
  return <a href={useBusinessBase(slug)} {...props} />;
}

export function BusinessLink({ slug, path = "", named, ...props }: { slug: string; path?: string; named?: string } & Omit<React.ComponentProps<typeof Link>, "href">) {
  const common = useCommonText();
  return <Link href={`${useBusinessBase(slug)}${path}`} aria-label={named === undefined ? undefined : fill(common.companyLink, { name: named })} {...props} />;
}
