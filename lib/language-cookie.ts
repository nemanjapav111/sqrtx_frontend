import { DEFAULT_LOCALE, LANG_COOKIE, hasLocale, parseAddress, prefersSerbian, type Locale } from "@/lib/i18n";

// The visitor's language choice, in the browser (lib/i18n.ts says how the site uses it). Browser code only.
export function readLanguageCookie(): Locale | null {
  const value = document.cookie.split("; ").find((part) => part.startsWith(`${LANG_COOKIE}=`))?.split("=")[1];
  return hasLocale(value) ? value : null;
}

export function writeLanguageCookie(lang: Locale) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

// Should the account menu offer the Language row? Only to visitors who can use it: the browser lists Serbian (in any form), or they already use Serbian
// (this page, or the language they chose or saved on their account). Everyone else only has English, so the row would be a choice of one.
export function offersLanguageChoice(pageLang: Locale): boolean {
  return pageLang !== DEFAULT_LOCALE || (readLanguageCookie() ?? DEFAULT_LOCALE) !== DEFAULT_LOCALE || prefersSerbian(navigator.languages ?? []);
}

// A signed-in user's account language (GET /account/bootstrap) wins over this browser's: the choice they made on another device is
// remembered here, and a page that takes the visitor's language is loaded again in it. Only once per tab for a language (if the browser
// refuses the cookie it would otherwise load again forever). A business's page keeps the language of its address: only the cookie changes,
// and the "also available in..." card offers the other one.
const SYNCED_KEY = "sqrtx:language-synced";
export function followAccountLanguage(account: string | null, pageLang: Locale) {
  if (!hasLocale(account) || readLanguageCookie() === account) return;
  writeLanguageCookie(account);
  if (parseAddress(window.location.pathname).business || pageLang === account) return;
  try {
    if (sessionStorage.getItem(SYNCED_KEY) === account) return;
    sessionStorage.setItem(SYNCED_KEY, account);
  } catch {
    return;
  }
  window.location.reload();
}
