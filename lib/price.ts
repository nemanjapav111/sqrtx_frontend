// How a price is written. Its own tiny file (no imports) so the public pages can use it without pulling in the login library
// (lib/products.ts reaches it through lib/api.ts).

// "$12000" or "$25": no thousands separator, cents only when there are some. null when there is no usable price.
function amountOf(price: number | string | null | undefined): string | null {
  if (price === null || price === undefined || price === "") return null;
  const amount = Number(price);
  if (!Number.isFinite(amount)) return null;
  return `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

// A product's price. No price: "Inquiry" (the word the add-product form promises for a blank price). Shared by the public pages and the
// owner's list.
export function formatPrice(price: number | string | null): string {
  return amountOf(price) ?? "Inquiry";
}

// What a service's price means, as the owner picks it in the form (the API's `price_type`, see API.md): an exact price, "from" a price, or per
// hour or per visit.
export type ServicePriceType = "exact" | "from" | "per_hour" | "per_visit";
export const SERVICE_PRICE_TYPES: { value: ServicePriceType; label: string }[] = [
  { value: "exact", label: "Fixed" },
  { value: "from", label: "From" },
  { value: "per_hour", label: "Per hour" },
  { value: "per_visit", label: "Per visit" },
];

// A service's price: "$50", "From $50", "$50 / hour" or "$50 / visit". No price at all is "Price on request", whatever the type (a service
// is usually quoted, so that is the word here instead of the products' "Inquiry"). A type this site doesn't know (a newer API) is read as exact.
export function formatServicePrice(price: number | string | null | undefined, type?: string | null): string {
  const amount = amountOf(price);
  if (amount === null) return "Price on request";
  if (type === "from") return `From ${amount}`;
  if (type === "per_hour") return `${amount} / hour`;
  if (type === "per_visit") return `${amount} / visit`;
  return amount;
}
