// The address of a product's own page: sqrtx.co/<business>/product/<name>-<id>, for example
// sqrtx.co/vega/product/mercedes-benz-bac12b52-362c-42a1-aa0e-2b726ac180c1.
// The id (a UUID, always the last 36 characters) is what finds the product; the name in front of it is only for people and search
// engines. So renaming a product never breaks an old link: any address that ends in the id finds the product, and the page then
// sends the visitor to the current address (a permanent redirect, see app/[slug]/product/[id]/page.tsx), so every product has exactly
// ONE address (one cached page, one entry in search engines). A name with nothing usable in it (a script with no Latin form, only
// symbols) leaves the bare id, which is also a valid address.

const UUID_AT_END = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const MAX_NAME_CHARS = 60; // longer names are cut at a word

// Serbian Cyrillic in Latin letters (the owners write names in either alphabet).
const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "dj", е: "e", ж: "z", з: "z", и: "i", ј: "j", к: "k", л: "l", љ: "lj", м: "m",
  н: "n", њ: "nj", о: "o", п: "p", р: "r", с: "s", т: "t", ћ: "c", у: "u", ф: "f", х: "h", ц: "c", ч: "c", џ: "dz", ш: "s",
};

/** The name as it is written in an address: lowercase letters and digits with single hyphens ("Čokolada & šlag" -> "cokolada-slag"). "" if nothing is left. */
export function nameSlug(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/[а-яђјљњћџ]/g, (letter) => CYRILLIC[letter] ?? letter)
    .replace(/đ/g, "dj")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // č ć š ž and the like lose their marks
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (words.length <= MAX_NAME_CHARS) return words;
  const cut = words.slice(0, MAX_NAME_CHARS);
  const at = cut.lastIndexOf("-");
  return (at > 20 ? cut.slice(0, at) : cut).replace(/-+$/, "");
}

/** The last part of a product's address: "<name>-<id>", or just the id. */
export function productSegment(name: string, id: string): string {
  const slug = nameSlug(name);
  return slug ? `${slug}-${id}` : id;
}

/** The whole address of a product's page, from its business's address. */
export const productPath = (businessSlug: string, product: { id: string; product_name: string }) =>
  `/${businessSlug}/product/${productSegment(product.product_name, product.id)}`;

/** The product's id from the last part of an address ("<name>-<id>" or the bare id), or null if there is none. */
export function idFromSegment(segment: string): string | null {
  const match = UUID_AT_END.exec(segment);
  return match ? match[1].toLowerCase() : null;
}
