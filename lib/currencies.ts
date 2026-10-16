// Which currency a business's prices are in. The currency belongs to the BUSINESS (one for all its products and services; a price is only a
// number and is never converted). At registration it is suggested from the country of the address that was picked, and the owner can change it.
// Every code must be one the API accepts (an ISO 4217 code, see `currency` in API.md).
import type { CategoryOption } from "@/app/[lang]/components/category-select";
import type { Locale } from "@/lib/i18n";

// The currency of each country, written the other way round (a currency and the countries that use it) because that is how it is known.
// A country that is not here (or a small territory) gets USD, which the owner can change in the box.
const COUNTRIES_OF: Record<string, string> = {
  AED: "AE", AFN: "AF", ALL: "AL", AMD: "AM", ANG: "CW SX", AOA: "AO", ARS: "AR", AUD: "AU CX CC HM KI NR NF TV", AWG: "AW", AZN: "AZ",
  BAM: "BA", BBD: "BB", BDT: "BD", BHD: "BH", BIF: "BI", BMD: "BM", BND: "BN", BOB: "BO", BRL: "BR", BSD: "BS", BTN: "BT", BWP: "BW", BYN: "BY", BZD: "BZ",
  CAD: "CA", CDF: "CD", CHF: "CH LI", CLP: "CL", CNY: "CN", COP: "CO", CRC: "CR", CUP: "CU", CVE: "CV", CZK: "CZ",
  DJF: "DJ", DKK: "DK FO GL", DOP: "DO", DZD: "DZ", EGP: "EG", ERN: "ER", ETB: "ET",
  EUR: "AD AT AX BE BG BL CY DE EE ES FI FR GF GP GR HR IE IT LT LU LV MC ME MF MQ MT NL PM PT RE SI SK SM TF VA XK YT",
  FJD: "FJ", FKP: "FK", GBP: "GB GG IM JE", GEL: "GE", GHS: "GH", GIP: "GI", GMD: "GM", GNF: "GN", GTQ: "GT", GYD: "GY",
  HKD: "HK", HNL: "HN", HTG: "HT", HUF: "HU", IDR: "ID", ILS: "IL PS", INR: "IN", IQD: "IQ", IRR: "IR", ISK: "IS",
  JMD: "JM", JOD: "JO", JPY: "JP", KES: "KE", KGS: "KG", KHR: "KH", KMF: "KM", KPW: "KP", KRW: "KR", KWD: "KW", KYD: "KY", KZT: "KZ",
  LAK: "LA", LBP: "LB", LKR: "LK", LRD: "LR", LSL: "LS", LYD: "LY", MAD: "MA EH", MDL: "MD", MGA: "MG", MKD: "MK", MMK: "MM", MNT: "MN", MOP: "MO",
  MRU: "MR", MUR: "MU", MVR: "MV", MWK: "MW", MXN: "MX", MYR: "MY", MZN: "MZ", NAD: "NA", NGN: "NG", NIO: "NI", NOK: "NO SJ BV", NPR: "NP",
  NZD: "NZ CK NU PN TK", OMR: "OM", PEN: "PE", PGK: "PG", PHP: "PH", PKR: "PK", PLN: "PL", PYG: "PY", QAR: "QA", RON: "RO", RSD: "RS", RUB: "RU", RWF: "RW",
  SAR: "SA", SBD: "SB", SCR: "SC", SDG: "SD", SEK: "SE", SGD: "SG", SHP: "SH", SLE: "SL", SOS: "SO", SRD: "SR", SSP: "SS", STN: "ST", SYP: "SY", SZL: "SZ",
  THB: "TH", TJS: "TJ", TMT: "TM", TND: "TN", TOP: "TO", TRY: "TR", TTD: "TT", TWD: "TW", TZS: "TZ", UAH: "UA", UGX: "UG",
  USD: "US EC SV PR GU AS VI MP UM TL PA ZW FM MH PW BQ TC VG IO", UYU: "UY", UZS: "UZ", VES: "VE", VND: "VN", VUV: "VU", WST: "WS",
  XAF: "CM CF TD CG GQ GA", XCD: "AG AI DM GD KN LC MS VC", XOF: "BJ BF CI GW ML NE SN TG", XPF: "PF NC WF", YER: "YE", ZAR: "ZA", ZMW: "ZM",
};

const CURRENCY_OF_COUNTRY = new Map<string, string>(
  Object.entries(COUNTRIES_OF).flatMap(([currency, countries]) => countries.split(" ").map((country) => [country, currency] as const)),
);

/** The currency to suggest for a country (its two-letter code, any letter case): USD for a country that is not known. */
export const currencyForCountry = (countryCode: string | null | undefined) => CURRENCY_OF_COUNTRY.get((countryCode ?? "").toUpperCase()) ?? "USD";

/** Every currency a business can choose. */
export const CURRENCY_CODES: readonly string[] = Object.keys(COUNTRIES_OF);
export const isCurrencyCode = (code: string) => code in COUNTRIES_OF;

// The language tags the browser's names come in (Serbian in Latin script, like the site).
const NAME_LOCALE: Record<Locale, string> = { en: "en", sr: "sr-Latn" };
const options: Partial<Record<Locale, CategoryOption[]>> = {};

const namesIn = (tag: string) => {
  try {
    return new Intl.DisplayNames([tag], { type: "currency" });
  } catch {
    return null; // a browser without it: the codes alone
  }
};

/** The currencies for the choice box, "US Dollar (USD)", by name in the page's language. The names come from the browser, so they are made on first use (not at import). The English name is a search word too, so "dollar" finds "Američki dolar". */
export function currencyOptions(lang: Locale): CategoryOption[] {
  const known = options[lang];
  if (known) return known;
  const names = namesIn(NAME_LOCALE[lang]);
  const english = lang === "en" ? null : namesIn("en");
  const made = CURRENCY_CODES.map((code) => {
    const name = names?.of(code);
    const englishName = english?.of(code);
    const keywords = [code.toLowerCase()];
    if (englishName && englishName !== code) keywords.push(englishName.toLowerCase());
    return { value: code, text: name && name !== code ? `${name} (${code})` : code, keywords };
  }).sort((a, b) => a.text.localeCompare(b.text, NAME_LOCALE[lang]));
  options[lang] = made;
  return made;
}
