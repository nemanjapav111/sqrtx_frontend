"use client";

import Link from "next/link";
import { useCommonText, useLang } from "@/app/[lang]/components/lang-context";
import { businessBase, fill } from "@/lib/i18n";

// The start of a business's addresses in the language of the page you are on: /vega in English, /sr/vega in Serbian (lib/i18n.ts says why).
export const useBusinessBase = (slug: string) => businessBase(slug, useLang());

// A link to a business's page, in the language of the page you are on: the marketplace's cards and rows lead to /sr/<business> for a visitor who reads Serbian.
// `named`: the business's name, for a link that is a whole card or row: its label for screen readers is then "<name>: all its products and services".
// `reload`: the owner's own "View my page" link. A plain click loads the page again from the server instead of moving inside the site, because the site may still hold the copy of
// the page it showed before the owner saved (a changed picture or price then looked unchanged until a refresh with F5). A click with Ctrl, Cmd or Shift, or a middle click, is left alone.
export function BusinessLink({ slug, path = "", named, reload = false, onClick, ...props }: { slug: string; path?: string; named?: string; reload?: boolean } & Omit<React.ComponentProps<typeof Link>, "href">) {
  const common = useCommonText();
  const href = `${useBusinessBase(slug)}${path}`;
  return (
    <Link
      href={href}
      aria-label={named === undefined ? undefined : fill(common.companyLink, { name: named })}
      onClick={(event) => {
        onClick?.(event);
        if (!reload || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        window.location.assign(href); // eslint-disable-line @next/next/no-location-assign-relative-destination -- a full load is the point
      }}
      {...props}
    />
  );
}
