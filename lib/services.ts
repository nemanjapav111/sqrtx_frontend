import { apiFetch } from "@/lib/api";
import { apiUpload, type UploadStatus } from "@/lib/upload";
import { priceOk } from "@/lib/products";
import { isSaved, type ZonePhoto } from "@/lib/photos";

export { priceOk };

// The API allows 1 to 30 images per service, JPEG, PNG, WebP, HEIC or HEIF, up to 10 MB each (see API.md).
export const MAX_SERVICE_IMAGES = 30;

// A service as the API returns it (only the parts this site uses).
export interface Service {
  id: string;
  service_name: string;
  price: number | string | null; // a Postgres numeric: reads may come back as a string
  category: string;
  description: string;
}

// A photo the user picked, waiting to be uploaded with the service. The id only tells the photos apart on screen.
export type ServiceImage = ZonePhoto;

// Everything the user types or picks in the service form.
export interface ServiceValues {
  name: string;
  price: string; // as typed; empty means "Inquiry"
  category: string;
  description: string;
  images: ServiceImage[]; // in the order shown: the first one is the main photo
}

export const emptyService: ServiceValues = { name: "", price: "", category: "", description: "", images: [] };

// The form is untouched: nothing typed, nothing picked.
export const isEmptyService = (v: ServiceValues) =>
  !v.name.trim() && !v.price.trim() && !v.category.trim() && !v.description.trim() && v.images.length === 0;

export type ServiceField = "name" | "price" | "category" | "images" | "description";

/** The fields that need fixing, in page order (so the first can get the cursor). */
export function invalidServiceFields(v: ServiceValues): ServiceField[] {
  const bad: ServiceField[] = [];
  if (!v.name.trim() || v.name.length > 255) bad.push("name");
  if (!priceOk(v.price)) bad.push("price");
  if (!v.category.trim() || v.category.length > 255) bad.push("category");
  if (v.images.length === 0 || v.images.length > MAX_SERVICE_IMAGES) bad.push("images");
  if (!v.description.trim()) bad.push("description"); // the API requires it
  return bad;
}

// ---------- talking to the API ----------

/** Every category that services use, most used first: the owner's own services and those of finished owners. */
export const getServiceCategories = () => apiFetch<string[]>("/service/categories");

/** Creates a service with its photos: multipart, the photos in the order shown (the first is the main one). `onProgress` hears how the upload goes. */
export function createService(v: ServiceValues, onProgress?: (status: UploadStatus) => void) {
  const form = new FormData(); // no Content-Type: the browser adds it, with the boundary
  form.append("service_name", v.name.trim());
  form.append("category", v.category.trim());
  form.append("description", v.description.trim());
  if (v.price.trim() !== "") form.append("price", v.price.trim().replace(",", "."));
  for (const image of v.images) if (!isSaved(image)) form.append("images", image.file);
  return apiUpload<Service>("/service", { method: "POST", body: form, onProgress });
}
