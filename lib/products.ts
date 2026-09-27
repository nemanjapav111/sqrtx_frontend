import { apiFetch } from "@/lib/api";

// The API allows 1 to 30 images per product, JPEG, PNG, WebP, HEIC or HEIF, up to 10 MB each (see API.md).
export const MAX_PRODUCT_IMAGES = 30;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // what the API takes, checked AFTER the photo has been shrunk

// Phone photos are often 20 MB or more, but nothing on the site is bigger than 1920 px, so every photo is shrunk in the
// browser before it is uploaded: long side at most 2400 px (the server keeps a 2400 px master, see the API notes),
// as a WebP at quality 0.9. That is about 1 MB, so the upload takes a second instead of many.
export const UPLOAD_MAX_SIDE = 2400;
export const UPLOAD_QUALITY = 0.9;
// A photo that is already small and light goes up untouched.
export const KEEP_AS_IS_BYTES = 1.5 * 1024 * 1024;
// Refuse absurd files before reading them into memory (the shrinking needs the photo decoded).
export const MAX_PICKED_BYTES = 100 * 1024 * 1024;

// A product as the API returns it (only the parts this site uses).
export interface Product {
  id: string;
  product_name: string;
  price: number | string | null; // a Postgres numeric: reads may come back as a string
  category: string;
  description: string;
}

// A photo the user picked, waiting to be uploaded with the product. The id only tells the photos apart on screen.
export interface ProductImage {
  id: string;
  file: File;
}

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

// Why one chosen photo can't be used at all, or null. HEIC files often have no type, so the name is checked too.
// The 10 MB limit is NOT checked here: a big photo is shrunk first (see shrinkPhoto) and the result is checked.
export function imageProblem(file: File): string | null {
  const typeOk = /^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
  if (!typeOk) return `"${file.name}" isn't a JPEG, PNG, WebP or HEIC photo.`;
  if (file.size > MAX_PICKED_BYTES) return `"${file.name}" is larger than 100 MB.`;
  return null;
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * The file that will be uploaded for a picked photo: the photo shrunk to UPLOAD_MAX_SIDE as a WebP (with the phone's
 * rotation applied and no metadata, so no GPS position either). Returns the photo itself, untouched, when
 *   - it is already small and light (at most UPLOAD_MAX_SIDE and KEEP_AS_IS_BYTES), or
 *   - the browser can't read it (HEIC in most browsers: the server converts those), or
 *   - shrinking would not make it smaller.
 * Never throws.
 */
export async function shrinkPhoto(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file); // applies the rotation stored in the photo
  } catch {
    return file;
  }
  try {
    const longSide = Math.max(bitmap.width, bitmap.height);
    if (longSide <= UPLOAD_MAX_SIDE && file.size <= KEEP_AS_IS_BYTES) return file;
    const scale = Math.min(1, UPLOAD_MAX_SIDE / longSide); // never enlarged
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);

    let blob = await toBlob(canvas, "image/webp", UPLOAD_QUALITY);
    if (blob?.type !== "image/webp") {
      // This browser can't make WebP (some Safari versions return a PNG instead): a JPEG on white, which is fine for photos.
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = "#fff";
      context.fillRect(0, 0, width, height);
      blob = await toBlob(canvas, "image/jpeg", UPLOAD_QUALITY);
    }
    if (!blob || blob.size >= file.size) return file;
    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${file.name.replace(/\.[^./\\]+$/, "")}.${extension}`, { type: blob.type });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}

// The photo tiles are small (189 px and 90 px), but the photos are big (a phone photo is 4000 px). Letting the browser
// shrink a 12-megapixel photo straight into a tile gives a poor picture (jagged with the fast setting, soft with the
// high quality one) and keeps every photo decoded at full size in memory. Instead the centre square is first drawn at
// THUMBNAIL_PX with the best smoothing and the tile shows that: measured against an ideal downscale it was the closest
// of the ways tried. 600 covers the big tile on a 3x phone screen. A small photo is never enlarged.
// Only the preview is affected: the original file is what gets uploaded.
export const THUMBNAIL_PX = 600;

/** Draws the centre square of the photo into the canvas, at most THUMBNAIL_PX wide. Rejects if the browser can't read the file (HEIC). */
export async function drawThumbnail(file: File, canvas: HTMLCanvasElement) {
  const bitmap = await createImageBitmap(file); // also applies the phone's rotation
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const size = Math.min(THUMBNAIL_PX, side);
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No canvas");
    context.fillStyle = "#fff"; // behind transparent parts of a PNG
    context.fillRect(0, 0, size, size);
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  } finally {
    bitmap.close();
  }
}

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
