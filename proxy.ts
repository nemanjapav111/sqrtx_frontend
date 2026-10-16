import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LANG_COOKIE, parseAddress, visitorLanguage } from "@/lib/i18n";

// Every page lives under app/[lang] (see lib/i18n.ts for why and how the language is chosen). The browser never sees that first part, except on
// a business's pages in a language other than English (sqrtx.co/sr/vega): this file points each request at the right copy of the page.
//  - A business's page, no language in the address: the English copy, whatever the visitor's browser says (the CDN keeps one copy per address).
//  - A business's page with /sr/ in the address: the Serbian copy, as it is.
//  - Any other page: the copy in the visitor's language (the saved choice, else the browser's, else English).
//  - Addresses that put a language where it doesn't belong (/en/vega, /sr/about) go to the address without it.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { lang, business, rest } = parseAddress(pathname);

  if (lang) {
    if (business && lang !== DEFAULT_LOCALE) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = rest;
    return NextResponse.redirect(url, lang === DEFAULT_LOCALE ? 308 : 307);
  }

  const target = business ? DEFAULT_LOCALE : visitorLanguage(request.cookies.get(LANG_COOKIE)?.value, request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${target}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  const response = NextResponse.rewrite(url);
  // The same address answers in different languages (not on a business's pages, which are always English here).
  if (!business) response.headers.set("Vary", "Cookie, Accept-Language");
  return response;
}

export const config = {
  // Not the framework's files, not files with an extension (pictures, scripts, robots.txt, the sitemap files).
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};

