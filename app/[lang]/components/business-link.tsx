"use client";

import Link from "next/link";
import { useCommonText, useLang } from "@/app/[lang]/components/lang-context";
import { businessBase, fill } from "@/lib/i18n";

// The start of a business's addresses in the language of the page you are on: /vega in English, /sr/vega in Serbian (lib/i18n.ts says why).
export const useBusinessBase = (slug: string) => businessBase(slug, useLang());

// A link to a business's page, in the language of the page you are on: the marketplace's cards and rows lead to /sr/<business> for a visitor who reads Serbian.
// `named`: the business's name, for a link that is a whole card or row: its label for screen readers is then "<name>: all its products and services".
export function BusinessLink({ slug, path = "", named, ...props }: { slug: string; path?: string; named?: string } & Omit<React.ComponentProps<typeof Link>, "href">) {
  const common = useCommonText();
  return <Link href={`${useBusinessBase(slug)}${path}`} aria-label={named === undefined ? undefined : fill(common.companyLink, { name: named })} {...props} />;
}
