// Languages. Two kinds of page, two ways to know the language (the owner chose this "hybrid", 2026-10-15):
//  - A BUSINESS's pages (sqrtx.co/<address>, its Contact, About, Services and item pages) are kept by a CDN, one copy per address, so
//    their language must be in the ADDRESS: sqrtx.co/vega is English, sqrtx.co/sr/vega is Serbian. (A cookie would make the first
//    visitor's language the one everybody gets.)
//  - Every other page (the marketplace, account, login, register, pricing, ...) takes the language of the visitor: the saved
//    choice (cookie), else the browser's languages, else English. Its address does not change; proxy.ts points the request at the
//    copy of the page that is built for that language (the folder app/[lang]).
export const LOCALES = ["en", "sr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

// The visitor's own choice (the account menu's Language row); a year.
export const LANG_COOKIE = "sqrtx_lang";

// Each language's name, in that language (what the picker shows).
export const LANGUAGE_NAMES: Record<Locale, string> = { en: "English", sr: "Srpski" };

export const hasLocale = (value: string | null | undefined): value is Locale => !!value && (LOCALES as readonly string[]).includes(value);
// The language of a page from its address's [lang] part (the root layout has already refused any other).
export const asLocale = (value: string): Locale => (hasLocale(value) ? value : DEFAULT_LOCALE);

// The first part of an address when it is one of the site's own pages and not a business's address (a business address is lowercase letters,
// digits and dashes, 3 to 50 long, and none of these: RESERVED_COMPANY_SLUGS in the API keeps them free).
export const SITE_PAGES: ReadonlySet<string> = new Set([
  "about", "account", "business", "companies", "forgot-password", "legal", "login", "pricing", "privacy", "product", "register",
  "reset-password", "service", "services", "terms",
]);

// The language of a browser's Accept-Language header ("sr-RS,sr;q=0.9,en;q=0.8"): the best-liked one that the site has (the part before
// the dash: sr-RS -> sr), else null.
export function languageFromHeader(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const wanted = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { base: tag.trim().toLowerCase().split("-")[0], q: q ? Number(q.slice(2)) : 1 };
    })
    .filter((entry) => entry.q > 0)
    .sort((a, b) => b.q - a.q);
  return wanted.find((entry) => hasLocale(entry.base))?.base as Locale | undefined ?? null;
}

// Does the browser's language list (navigator.languages) have Serbian in any form: sr, sr-Latn, sr-Cyrl, sr-RS, sr-Latn-ME...?
export const prefersSerbian = (languages: readonly string[]) => languages.some((tag) => tag.trim().toLowerCase().split("-")[0] === "sr");

// The language for a page that takes the visitor's: the saved choice, else the browser's, else English.
export function visitorLanguage(cookie: string | null | undefined, header: string | null | undefined): Locale {
  return (hasLocale(cookie) ? cookie : null) ?? languageFromHeader(header) ?? DEFAULT_LOCALE;
}

// Where a business's own pages begin: /vega in English, /sr/vega in Serbian.
export const businessBase = (slug: string, lang: Locale) => (lang === DEFAULT_LOCALE ? `/${slug}` : `/${lang}/${slug}`);

// Is this address (as the browser shows it) a business's page, and which language is it in? A leading language is only part of the address
// on a business's pages.
export function parseAddress(pathname: string): { lang: Locale | null; business: boolean; rest: string } {
  const parts = pathname.split("/").filter(Boolean);
  const lang = hasLocale(parts[0]) ? parts[0] : null;
  const restParts = lang ? parts.slice(1) : parts;
  return { lang, business: restParts.length > 0 && !SITE_PAGES.has(restParts[0]), rest: "/" + restParts.join("/") };
}

// The same page in another language, for the language picker: a business's page moves to the other language's address; any other page keeps
// its address (the cookie decides).
export function addressInLanguage(pathname: string, lang: Locale): string {
  const { business, rest } = parseAddress(pathname);
  if (!business) return pathname;
  return lang === DEFAULT_LOCALE ? rest : `/${lang}${rest}`;
}

// What the "this page is also in your language" bar says (in the language it offers), and how it is dismissed.
export const OFFER: Record<Locale, { text: string; action: string; dismiss: string }> = {
  en: { text: "This page is also available in English.", action: "Show in English", dismiss: "Close" },
  sr: { text: "Ova stranica je dostupna i na srpskom.", action: "Prikaži na srpskom", dismiss: "Zatvori" },
};

// Puts values into a text's {marks}: fill("Resend in {n}s", { n: 42 }) → "Resend in 42s". The texts are plain strings so a server page can pass them to client components.
export const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (mark, key: string) => (key in values ? String(values[key]) : mark));

// The language tag the browser formats dates and the like with (Serbian in Latin script, like the site).
export const FORMAT_LOCALE: Record<Locale, string> = { en: "en-US", sr: "sr-Latn" };

/** The country's name from its two-letter code ("US" -> "United States", in Serbian "Sjedinjene Američke Države"); the code itself if the browser's list doesn't know it. */
export function countryName(code: string, lang: Locale = "en"): string {
  try {
    return new Intl.DisplayNames([FORMAT_LOCALE[lang]], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

// The right form of a text for a number: English has "one" and "other", Serbian also "few" (2 to 4: 1 dan, 2 dana, 5 dana). Every language gives all three so the dictionaries stay alike.
export type PluralForms = { one: string; few: string; other: string };
export const plural = (lang: Locale, n: number, forms: PluralForms): string =>
  forms[new Intl.PluralRules(FORMAT_LOCALE[lang]).select(n) as keyof PluralForms] ?? forms.other;
