// How a price is written. Its own tiny file (no imports) so the public pages can use it without pulling in the login library
// (lib/products.ts reaches it through lib/api.ts).

// The currency a business's prices are in (its `currency`, an ISO 4217 code). The API sends it with every business and every feed item;
// a missing one (an older answer) is read as USD, what every price was shown in before.
export const DEFAULT_CURRENCY = "USD";

// "$12000", "€25" or "RSD 2500": the currency's symbol, no thousands separator, cents only when there are some. null when there is no usable price.
// The symbol is the one for English readers ("CA$", "A$" for the Canadian and Australian dollar), so prices of businesses in different
// countries on one page are never mistaken for each other.
function amountOf(price: number | string | null | undefined, currency: string | null | undefined): string | null {
  if (price === null || price === undefined || price === "") return null;
  const amount = Number(price);
  if (!Number.isFinite(amount)) return null;
  const digits = Number.isInteger(amount) ? 0 : 2;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || DEFAULT_CURRENCY,
      useGrouping: false,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${currency} ${Number.isInteger(amount) ? amount : amount.toFixed(2)}`; // not a currency this browser knows
  }
}

// Just the symbol of a currency, for the start of a price box ("$", "€", "RSD").
export function currencySymbol(currency: string | null | undefined): string {
  try {
    const parts = new Intl.NumberFormat("en-US", { style: "currency", currency: currency || DEFAULT_CURRENCY }).formatToParts(0);
    return parts.find((part) => part.type === "currency")?.value ?? currency ?? DEFAULT_CURRENCY;
  } catch {
    return currency ?? DEFAULT_CURRENCY;
  }
}

// The words around a price, in the page's language (common.price in the dictionaries; {amount} is where the number goes). A caller that does not
// pass them gets English.
export interface PriceWords {
  onRequest: string;
  from: string;
  perHour: string;
  perVisit: string;
}
export const ENGLISH_PRICE_WORDS: PriceWords = { onRequest: "Price on request", from: "From {amount}", perHour: "{amount} / hour", perVisit: "{amount} / visit" };

// A product's price. No price: "Price on request" (what the add-product form promises for a blank price, and the same words as a service
// without a price). Shared by the public pages and the owner's list.
export function formatPrice(price: number | string | null, currency?: string | null, words: PriceWords = ENGLISH_PRICE_WORDS): string {
  return amountOf(price, currency) ?? words.onRequest;
}

// What a service's price means, as the owner picks it in the form (the API's `price_type`, see API.md): an exact price, "from" a price, or per
// hour or per visit.
export type ServicePriceType = "exact" | "from" | "per_hour" | "per_visit";
export const SERVICE_PRICE_TYPES: ServicePriceType[] = ["exact", "from", "per_hour", "per_visit"]; // button names come from the dictionary

// A service's price: "$50", "From $50", "$50 / hour" or "$50 / visit" (in the business's currency). No price at all is "Price on request", whatever the type (a service
// is usually quoted). A type this site doesn't know (a newer API) is read as exact.
export function formatServicePrice(
  price: number | string | null | undefined,
  type?: string | null,
  currency?: string | null,
  words: PriceWords = ENGLISH_PRICE_WORDS,
): string {
  const amount = amountOf(price, currency);
  if (amount === null) return words.onRequest;
  if (type === "from") return words.from.replace("{amount}", amount);
  if (type === "per_hour") return words.perHour.replace("{amount}", amount);
  if (type === "per_visit") return words.perVisit.replace("{amount}", amount);
  return amount;
}
