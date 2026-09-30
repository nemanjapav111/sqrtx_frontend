import { apiFetch, jsonBody } from "@/lib/api";
import { isSaved, type PickedPhoto, type ZonePhoto } from "@/lib/photos";

// Re-exported so existing imports of these from lib/products keep working: the shrinking/thumbnail/validation
// logic itself is shared with services now (see lib/photos.ts).
export { MAX_IMAGE_BYTES, UPLOAD_MAX_SIDE, UPLOAD_QUALITY, KEEP_AS_IS_BYTES, MAX_PICKED_BYTES, THUMBNAIL_PX, imageProblem, shrinkPhoto, drawThumbnail } from "@/lib/photos";

// The API allows 1 to 30 images per product, JPEG, PNG, WebP, HEIC or HEIF, up to 10 MB each (see API.md).
export const MAX_PRODUCT_IMAGES = 30;

// A product as the API returns it (only the parts this site uses).
export interface Product {
  id: string;
  product_name: string;
  price: number | string | null; // a Postgres numeric: reads may come back as a string
  category: string;
  description: string;
}

// A photo in the form: one picked just now (waiting to be uploaded with the product) or, when editing, one that is
// already saved. The id only tells the photos apart on screen (for a saved photo it is the API's image id).
export type ProductImage = ZonePhoto;

// Everything the user types or picks in the product form.
export interface ProductValues {
  name: string;
  price: string; // as typed; empty means "Inquiry"
  category: string;
  description: string;
  images: ProductImage[]; // in the order shown: the first one is the main photo
}

export const emptyProduct: ProductValues = { name: "", price: "", category: "", description: "", images: [] };

// "12", "12.5", "12,50": what people type for a price. A comma counts as the decimal point.
const PRICE_PATTERN = /^\d{1,10}([.,]\d{1,2})?$/;
export const priceOk = (price: string) => price.trim() === "" || PRICE_PATTERN.test(price.trim());

// The form is untouched: nothing typed, nothing picked.
export const isEmptyProduct = (v: ProductValues) =>
  !v.name.trim() && !v.price.trim() && !v.category.trim() && !v.description.trim() && v.images.length === 0;

export type ProductField = "name" | "price" | "category" | "images" | "description";

/** The fields that need fixing, in page order (so the first can get the cursor). */
export function invalidProductFields(v: ProductValues): ProductField[] {
  const bad: ProductField[] = [];
  if (!v.name.trim() || v.name.length > 255) bad.push("name");
  if (!priceOk(v.price)) bad.push("price");
  if (!v.category.trim() || v.category.length > 255) bad.push("category");
  if (v.images.length === 0 || v.images.length > MAX_PRODUCT_IMAGES) bad.push("images");
  if (!v.description.trim()) bad.push("description"); // the API requires it
  return bad;
}

// ---------- talking to the API ----------

/** Every category that products use, most used first: the owner's own products and those of finished owners. */
export const getProductCategories = () => apiFetch<string[]>("/product/categories");

/** Creates a product with its photos: multipart, the photos in the order shown (the first is the main one). */
export function createProduct(v: ProductValues) {
  const form = new FormData(); // no Content-Type: the browser adds it, with the boundary
  form.append("product_name", v.name.trim());
  form.append("category", v.category.trim());
  form.append("description", v.description.trim());
  if (v.price.trim() !== "") form.append("price", v.price.trim().replace(",", "."));
  for (const image of v.images) if (!isSaved(image)) form.append("images", image.file);
  return apiFetch<Product>("/product", { method: "POST", body: form });
}

// ---------- editing products that are already saved ----------

// One saved image of the owner's own product (GET /product/mine): `urls.card` fits inside 604 x 604 (see API.md).
export interface MyProductImage {
  id: string;
  sort_order: number;
  is_primary: boolean;
  urls: { card: { avif: string; webp: string } };
}

// The owner's own product with its images. Unlike the public list this includes products the public can't see (the
// business no longer offers products, the trial is over), so the owner can always reach them.
export interface MyProduct extends Product {
  images: MyProductImage[];
}

/** One page of the owner's products (each with only its main photo), newest first, for the list: see API.md. */
export interface MyProductsPage {
  items: MyProduct[];
  total: number; // everything that matches the search and category, not only this page
  page: number;
  limit: number;
  categories: string[]; // all of the owner's categories, whatever the search
}
export const MY_PRODUCTS_PAGE_SIZE = 20;

/** A page of the owner's products; `q` searches the name and category, `category` keeps one category. */
export function getMyProductsPage({ q, category, page }: { q: string; category: string; page: number }) {
  const params = new URLSearchParams({ page: String(page), limit: String(MY_PRODUCTS_PAGE_SIZE) });
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  return apiFetch<MyProductsPage>(`/product/mine/list?${params}`);
}

/** One of the owner's products with all its photos, whatever the public can see. A 404 ApiError if it isn't theirs. */
export const getMyProduct = (id: string) => apiFetch<MyProduct>(`/product/mine/${encodeURIComponent(id)}`);

/** Deletes the product; the API also deletes its photos' files. */
export const deleteProduct = (id: string) => apiFetch<unknown>(`/product/${id}`, { method: "DELETE" });

const byOrder = (a: MyProductImage, b: MyProductImage) => a.sort_order - b.sort_order;

/** The form's values for a saved product: its photos come as saved photos, in the order they are shown. */
export function valuesFromProduct(p: MyProduct): ProductValues {
  const price = p.price === null || p.price === "" ? "" : String(Number(p.price));
  const images = [...p.images].sort(byOrder).map((image, i) => ({
    id: image.id,
    url: image.urls.card.webp,
    name: `Photo ${i + 1}`,
  }));
  return { name: p.product_name, price, category: p.category, description: p.description, images };
}

/**
 * Saves the edited form of a saved product. Only what changed is sent, in this order:
 *  1. the text fields (PATCH),
 *  2. removed photos are deleted and new ones are uploaded, then
 *  3. the photos are put in the order shown (the first is the main one).
 * A product must keep at least one photo and can hold 30, so when some photos stay, the removed ones go first (making
 * room for new ones); when none stay, the new ones go up first (so the product is never without a photo).
 * It is several requests, so it can fail half way: the caller reloads the product to show what really is saved.
 */
export async function saveProductEdits(original: MyProduct, v: ProductValues): Promise<void> {
  const changes: Record<string, unknown> = {};
  if (v.name.trim() !== original.product_name) changes.product_name = v.name.trim();
  if (v.category.trim() !== original.category) changes.category = v.category.trim();
  if (v.description.trim() !== original.description) changes.description = v.description.trim();
  const price = v.price.trim() === "" ? null : Number(v.price.trim().replace(",", "."));
  const oldPrice = original.price === null || original.price === "" ? null : Number(original.price);
  if (price !== oldPrice) changes.price = price; // null clears it: "Inquiry"
  if (Object.keys(changes).length > 0) await apiFetch(`/product/${original.id}`, jsonBody("PATCH", changes));

  const keptIds = new Set(v.images.filter(isSaved).map((image) => image.id));
  const removed = original.images.filter((image) => !keptIds.has(image.id));
  const picked = v.images.filter((image): image is PickedPhoto => !isSaved(image));

  const removeOld = async () => {
    for (const image of removed) await apiFetch(`/product-image/${image.id}`, { method: "DELETE" });
  };
  const uploadNew = async () => {
    if (picked.length === 0) return [] as { id: string }[];
    const form = new FormData();
    for (const photo of picked) form.append("images", photo.file);
    return apiFetch<{ id: string }[]>(`/product-image/product/${original.id}`, { method: "POST", body: form });
  };
  let created: { id: string }[];
  if (keptIds.size > 0) {
    await removeOld();
    created = await uploadNew();
  } else {
    created = await uploadNew();
    await removeOld();
  }

  // The order the server has now: the kept photos as they were, then the new ones after them.
  const now = [
    ...[...original.images].sort(byOrder).filter((image) => keptIds.has(image.id)).map((image) => image.id),
    ...created.map((image) => image.id),
  ];
  let next = 0;
  const wanted = v.images.map((image) => (isSaved(image) ? image.id : created[next++].id));
  if (wanted.some((id, i) => id !== now[i])) {
    await apiFetch(`/product-image/product/${original.id}/order`, jsonBody("PUT", { imageIds: wanted }));
  }
}
