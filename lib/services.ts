import { apiFetch, jsonBody } from "@/lib/api";
import { apiUpload, type UploadStatus } from "@/lib/upload";
import { priceOk } from "@/lib/products";
import { isSaved, type PickedPhoto, type ZonePhoto } from "@/lib/photos";
import type { ServicePriceType } from "@/lib/price";

export { priceOk };

// The API allows 1 to 30 images per service, JPEG, PNG, WebP, HEIC or HEIF, up to 10 MB each (see API.md).
export const MAX_SERVICE_IMAGES = 30;

// The two short optional facts of a service (the API's limits, see API.md): how long it takes and where the business works.
export const SERVICE_DURATION_MAX_LENGTH = 60;
export const SERVICE_AREA_MAX_LENGTH = 120;

// A service as the API returns it (only the parts this site uses).
export interface Service {
  id: string;
  service_name: string;
  price: number | string | null; // a Postgres numeric: reads may come back as a string
  price_type: ServicePriceType;
  category: string;
  description: string;
  duration: string | null;
  service_area: string | null;
}

// A photo the user picked, waiting to be uploaded with the service. The id only tells the photos apart on screen.
export type ServiceImage = ZonePhoto;

// Everything the user types or picks in the service form.
export interface ServiceValues {
  name: string;
  price: string; // as typed; empty means "Price on request"
  priceType: ServicePriceType; // what the price means (a blank price has none)
  category: string;
  description: string;
  duration: string; // optional: how long it takes
  serviceArea: string; // optional: where the business works
  images: ServiceImage[]; // in the order shown: the first one is the main photo
}

export const emptyService: ServiceValues = {
  name: "",
  price: "",
  priceType: "exact",
  category: "",
  description: "",
  duration: "",
  serviceArea: "",
  images: [],
};

// The form is untouched: nothing typed, nothing picked.
export const isEmptyService = (v: ServiceValues) =>
  !v.name.trim() &&
  !v.price.trim() &&
  !v.category.trim() &&
  !v.description.trim() &&
  !v.duration.trim() &&
  !v.serviceArea.trim() &&
  v.images.length === 0;

export type ServiceField = "name" | "price" | "category" | "images" | "description";

/** The fields that need fixing, in page order (so the first can get the cursor). */
export function invalidServiceFields(v: ServiceValues): ServiceField[] {
  const bad: ServiceField[] = [];
  if (!v.name.trim() || v.name.length > 255) bad.push("name");
  if (!priceOk(v.price)) bad.push("price");
  if (!v.category.trim() || v.category.length > 255) bad.push("category");
  if (v.images.length === 0 || v.images.length > MAX_SERVICE_IMAGES) bad.push("images");
  if (!v.description.trim()) bad.push("description"); // the API requires it
  // (the duration and the area are optional, and their boxes stop typing at their limits)
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
  form.append("price_type", v.priceType);
  if (v.duration.trim()) form.append("duration", v.duration.trim());
  if (v.serviceArea.trim()) form.append("service_area", v.serviceArea.trim());
  for (const image of v.images) if (!isSaved(image)) form.append("images", image.file);
  return apiUpload<Service>("/service", { method: "POST", body: form, onProgress });
}

// ---------- editing services that are already saved ----------

// One saved image of the owner's own service (GET /service/mine): `urls.thumb` is the 270 x 270 square, `urls.detail` fits inside 1536 x 900 (see API.md).
export interface MyServiceImage {
  id: string;
  sort_order: number;
  is_primary: boolean;
  // A tiny WebP data URI that becomes the blurred preview while the picture loads; null for an image saved before the API made them.
  placeholder?: string | null;
  urls: { thumb?: { avif: string; webp: string }; detail: { avif: string; webp: string } };
}

// The owner's own service with its images. Unlike the public list this includes services the public can't see (the
// business no longer offers services, the trial is over), so the owner can always reach them.
export interface MyService extends Service {
  images: MyServiceImage[];
}

/** One page of the owner's services (each with only its main photo), newest first, for the list: see API.md. */
export interface MyServicesPage {
  items: MyService[];
  total: number; // everything that matches the search and category, not only this page
  page: number;
  limit: number;
  categories: string[]; // all of the owner's categories, whatever the search
}
export const MY_SERVICES_PAGE_SIZE = 20;

/** A page of the owner's services; `q` searches the name and category, `category` keeps one category. */
export function getMyServicesPage({ q, category, page }: { q: string; category: string; page: number }) {
  const params = new URLSearchParams({ page: String(page), limit: String(MY_SERVICES_PAGE_SIZE) });
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  return apiFetch<MyServicesPage>(`/service/mine/list?${params}`);
}

/** One of the owner's services with all its photos, whatever the public can see. A 404 ApiError if it isn't theirs. */
export const getMyService = (id: string) => apiFetch<MyService>(`/service/mine/${encodeURIComponent(id)}`);

/** Deletes the service; the API also deletes its photos' files. */
export const deleteService = (id: string) => apiFetch<unknown>(`/service/${id}`, { method: "DELETE" });

const byOrder = (a: MyServiceImage, b: MyServiceImage) => a.sort_order - b.sort_order;

/** The form's values for a saved service: its photos come as saved photos, in the order they are shown. */
export function valuesFromService(p: MyService): ServiceValues {
  const price = p.price === null || p.price === "" ? "" : String(Number(p.price));
  const images = [...p.images].sort(byOrder).map((image, i) => ({
    id: image.id,
    url: (image.urls.thumb ?? image.urls.detail).webp,
    name: `Photo ${i + 1}`,
  }));
  return {
    name: p.service_name,
    price,
    priceType: p.price_type ?? "exact",
    category: p.category,
    description: p.description,
    duration: p.duration ?? "",
    serviceArea: p.service_area ?? "",
    images,
  };
}

/**
 * Saves the edited form of a saved service. Only what changed is sent, in this order:
 *  1. the text fields (PATCH),
 *  2. removed photos are deleted and new ones are uploaded, then
 *  3. the photos are put in the order shown (the first is the main one).
 * A service must keep at least one photo and can hold 30, so when some photos stay, the removed ones go first (making
 * room for new ones); when none stay, the new ones go up first (so the service is never without a photo).
 * It is several requests, so it can fail half way: the caller reloads the service to show what really is saved.
 */
export async function saveServiceEdits(original: MyService, v: ServiceValues, onProgress?: (status: UploadStatus) => void): Promise<void> {
  const changes: Record<string, unknown> = {};
  if (v.name.trim() !== original.service_name) changes.service_name = v.name.trim();
  if (v.category.trim() !== original.category) changes.category = v.category.trim();
  if (v.description.trim() !== original.description) changes.description = v.description.trim();
  const price = v.price.trim() === "" ? null : Number(v.price.trim().replace(",", "."));
  const oldPrice = original.price === null || original.price === "" ? null : Number(original.price);
  if (price !== oldPrice) changes.price = price; // null clears it: "Price on request"
  if (v.priceType !== (original.price_type ?? "exact")) changes.price_type = v.priceType;
  if (v.duration.trim() !== (original.duration ?? "")) changes.duration = v.duration.trim() || null; // null clears it
  if (v.serviceArea.trim() !== (original.service_area ?? "")) changes.service_area = v.serviceArea.trim() || null;
  if (Object.keys(changes).length > 0) await apiFetch(`/service/${original.id}`, jsonBody("PATCH", changes));

  const keptIds = new Set(v.images.filter(isSaved).map((image) => image.id));
  const removed = original.images.filter((image) => !keptIds.has(image.id));
  const picked = v.images.filter((image): image is PickedPhoto => !isSaved(image));

  const removeOld = async () => {
    for (const image of removed) await apiFetch(`/service-image/${image.id}`, { method: "DELETE" });
  };
  const uploadNew = async () => {
    if (picked.length === 0) return [] as { id: string }[];
    const form = new FormData();
    for (const photo of picked) form.append("images", photo.file);
    return apiUpload<{ id: string }[]>(`/service-image/service/${original.id}`, { method: "POST", body: form, onProgress });
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
    await apiFetch(`/service-image/service/${original.id}/order`, jsonBody("PUT", { imageIds: wanted }));
  }
}
