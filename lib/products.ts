import { apiFetch } from "@/lib/api";
import type { PickedPhoto } from "@/lib/photos";

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

// A photo the user picked, waiting to be uploaded with the product. The id only tells the photos apart on screen.
export type ProductImage = PickedPhoto;

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
  for (const image of v.images) form.append("images", image.file);
  return apiFetch<Product>("/product", { method: "POST", body: form });
}
