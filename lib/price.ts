// How a price is written. Its own tiny file (no imports) so the public pages can use it without pulling in the login library
// (lib/products.ts reaches it through lib/api.ts).

// "$12000" or "$25": no thousands separator, cents only when there are some. No price: "Inquiry" (the word the
// add-product form promises for a blank price). Shared by the public pages and the owner's list.
export function formatPrice(price: number | string | null): string {
  if (price === null || price === "") return "Inquiry";
  const amount = Number(price);
  if (!Number.isFinite(amount)) return "Inquiry";
  return `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}
