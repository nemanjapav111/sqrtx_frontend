import { ApiError, apiFetch, jsonBody } from "@/lib/api";
import type { PlaceDetails } from "@/lib/places";
import { emailOk } from "@/lib/validation";

// The business profile: what the form collects, how it is checked, and how it is sent to the API.
// The API's rules are in API.md in the backend ("Business profile").

// The company page address is shown as sqrtx.co/<slug>. It is saved in the API as the full URL.
export const SITE_HOST = "sqrtx.co";

// TODO: placeholder list. The design doesn't say which categories exist, so replace this with the real list.
export const BUSINESS_CATEGORIES = [
  "Bakery",
  "Restaurant & cafe",
  "Grocery & food",
  "Clothing & fashion",
  "Health & beauty",
  "Home & garden",
  "Electronics",
  "Construction & repair",
  "Professional services",
  "Education & training",
  "Automotive",
  "Other",
];

// Words that already mean something on the site, so a company can't take them as its address (sqrtx.co/login).
// The API must refuse these too, because this list can be bypassed.
const RESERVED_SLUGS = [
  "about", "admin", "api", "business", "businesses", "company", "contact", "help", "login", "onboarding",
  "privacy", "products", "register", "services", "settings", "support", "terms", "www",
];

export type Provides = "products" | "services" | "both";

// What the API returns for GET /business-profile/me (only the parts the form uses).
export interface BusinessProfile {
  company_name: string;
  business_category: string;
  google_place_id: string;
  formatted_address: string;
  street_address: string | null;
  city: string;
  state_province: string | null;
  postal_code: string | null;
  country_code: string;
  coordinates: { type: "Point"; coordinates: [number, number] }; // [longitude, latitude]
  contact_email: string;
  phone: string | null;
  hours: string | null;
  facebook_link: string | null;
  instagram_link: string | null;
  company_url: string;
  provides: Provides;
  // width and height: pixels of these files. null only for a logo saved before the API kept them (see API.md).
  logo: { avif: string; webp: string; width: number | null; height: number | null } | null;
}

// Everything the user types or picks in the form.
export interface ProfileValues {
  companyName: string;
  category: string;
  addressText: string; // what is in the address box
  place: PlaceDetails | null; // set only when the user picked a suggestion
  contactEmail: string;
  phone: string;
  hours: string;
  facebook: string;
  instagram: string;
  slug: string;
  products: boolean;
  services: boolean;
  logo: File | null; // a newly chosen file (an already saved logo is not a File)
  logoSize: { width: number; height: number } | null; // its pixels, once read (null while reading, or a format the browser can't read)
}

export const emptyValues: ProfileValues = {
  companyName: "",
  category: "",
  addressText: "",
  place: null,
  contactEmail: "",
  phone: "",
  hours: "",
  facebook: "",
  instagram: "",
  slug: "",
  products: false,
  services: false,
  logo: null,
  logoSize: null,
};

export function valuesFromProfile(p: BusinessProfile): ProfileValues {
  return {
    companyName: p.company_name,
    category: p.business_category,
    addressText: p.formatted_address,
    place: {
      id: p.google_place_id,
      formattedAddress: p.formatted_address,
      latitude: p.coordinates.coordinates[1],
      longitude: p.coordinates.coordinates[0],
      countryCode: p.country_code,
      city: p.city,
      street: p.street_address,
      state: p.state_province,
      postalCode: p.postal_code,
    },
    contactEmail: p.contact_email,
    phone: p.phone ?? "",
    hours: p.hours ?? "",
    facebook: p.facebook_link ?? "",
    instagram: p.instagram_link ?? "",
    slug: slugFromUrl(p.company_url),
    products: p.provides !== "services",
    services: p.provides !== "products",
    logo: null,
    logoSize: null,
  };
}

const slugFromUrl = (url: string) => {
  try {
    return new URL(url).pathname.replace(/^\/+|\/+$/g, "");
  } catch {
    return "";
  }
};

// ---------- checks ----------

export type FieldName =
  | "companyName"
  | "category"
  | "place"
  | "contactEmail"
  | "phone"
  | "facebook"
  | "instagram"
  | "slug"
  | "provides"
  | "logo";

// Lowercase letters, digits and dashes, 3 to 50 characters, not starting or ending with a dash.
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
export const cleanSlug = (typed: string) => typed.toLowerCase().replace(/[^a-z0-9-]/g, "");
export const slugOk = (slug: string) => SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.includes(slug);

// A link may be typed without "https://" (as in the design's examples), so it is added when missing.
export const normalizeUrl = (typed: string) => {
  const url = typed.trim();
  return url === "" || /^https?:\/\//i.test(url) ? url : `https://${url}`;
};
const urlOk = (typed: string) => {
  try {
    const { hostname } = new URL(normalizeUrl(typed));
    return hostname.includes(".");
  } catch {
    return false;
  }
};

// Optional. If given: starts with "+" (country code) and has 7 to 15 digits.
export const phoneOk = (phone: string) => {
  const p = phone.trim();
  if (p === "") return true;
  const digits = p.replace(/\D/g, "").length;
  return /^\+[\d\s().-]+$/.test(p) && digits >= 7 && digits <= 15;
};

// The API accepts JPEG, PNG, WebP, HEIC and HEIF up to 10 MB. Windows often reports HEIC files with no type, so the name is checked too.
export const MAX_LOGO_BYTES = 10 * 1024 * 1024;
export const logoProblem = (file: File): string | null => {
  const typeOk = /^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
  if (!typeOk) return "Use a JPEG, PNG, WebP or HEIC photo.";
  if (file.size > MAX_LOGO_BYTES) return "The photo is larger than 10 MB.";
  return null;
};

// The logo is shown at most 110 x 68 (the phone navbar has little room), fitted inside without cropping or
// enlarging. Sharp (retina) screens need twice the pixels, and a picture fitted into that box is limited by
// its width or its height, whichever runs out first: so it must be 220 px wide OR 136 px tall.
export const MIN_LOGO_WIDTH = 220;
export const MIN_LOGO_HEIGHT = 136;
// TODO: placeholder text, there is no design for it.
export const logoSizeProblem = (size: ProfileValues["logoSize"]): string | null =>
  size && size.width < MIN_LOGO_WIDTH && size.height < MIN_LOGO_HEIGHT
    ? `This logo is too small (${size.width} x ${size.height} px). Use one at least ${MIN_LOGO_WIDTH} px wide or ${MIN_LOGO_HEIGHT} px tall.`
    : null;

/** Why the newly chosen logo can't be used, or null. An unknown size passes: the browser can't read every format (HEIC). */
export const logoProblemOf = (v: Pick<ProfileValues, "logo" | "logoSize">): string | null =>
  v.logo ? (logoProblem(v.logo) ?? logoSizeProblem(v.logoSize)) : null;

/** The picture's size in pixels, or null when the browser can't decode it. */
export async function readImageSize(file: File): Promise<ProfileValues["logoSize"]> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}

// The full URL saved in the API for a company page name.
const companyUrl = (slug: string) => `https://${SITE_HOST}/${slug}`;

/** Asks the API if another business already uses this page name. Only a hint: saving checks again. */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const { available } = await apiFetch<{ available: boolean }>(
    `/business-profile/check-url?company_url=${encodeURIComponent(companyUrl(slug))}`,
  );
  return available;
}

export const providesOf = (v: Pick<ProfileValues, "products" | "services">): Provides | null =>
  v.products && v.services ? "both" : v.products ? "products" : v.services ? "services" : null;

/**
 * The fields that need fixing, in page order (so the first can get the cursor).
 * `hasSavedLogo`: in edit mode an already saved logo satisfies the "logo is required" rule.
 */
export function invalidFields(v: ProfileValues, hasSavedLogo: boolean): FieldName[] {
  const bad: FieldName[] = [];
  if (v.companyName.trim() === "" || v.companyName.length > 255) bad.push("companyName");
  if (!BUSINESS_CATEGORIES.includes(v.category)) bad.push("category");
  if (!v.place) bad.push("place");
  if (!emailOk(v.contactEmail)) bad.push("contactEmail");
  if (!phoneOk(v.phone)) bad.push("phone");
  if (v.facebook.trim() !== "" && !urlOk(v.facebook)) bad.push("facebook");
  if (v.instagram.trim() !== "" && !urlOk(v.instagram)) bad.push("instagram");
  if (!slugOk(v.slug)) bad.push("slug");
  if (!providesOf(v)) bad.push("provides");
  if (v.logo ? logoProblemOf(v) : !hasSavedLogo) bad.push("logo");
  return bad;
}

// ---------- talking to the API ----------

export async function getMyProfile(): Promise<BusinessProfile | null> {
  try {
    return await apiFetch<BusinessProfile>("/business-profile/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null; // no profile yet
    throw err;
  }
}

// The text fields, the same for creating and updating.
function textFields(v: ProfileValues) {
  const place = v.place!; // checked by invalidFields() before saving
  return {
    company_name: v.companyName.trim(),
    business_category: v.category,
    google_place_id: place.id,
    formatted_address: place.formattedAddress,
    city: place.city,
    country_code: place.countryCode,
    contact_email: v.contactEmail.trim(),
    company_url: companyUrl(v.slug),
    provides: providesOf(v)!,
  };
}

// Optional fields: `null` means "not given" (creating leaves them out, updating clears them).
function optionalFields(v: ProfileValues) {
  const place = v.place!;
  const text = (s: string) => (s.trim() === "" ? null : s.trim());
  return {
    street_address: place.street,
    state_province: place.state,
    postal_code: place.postalCode,
    phone: text(v.phone),
    hours: text(v.hours),
    facebook_link: text(normalizeUrl(v.facebook)),
    instagram_link: text(normalizeUrl(v.instagram)),
  };
}

/** First save: multipart with the logo. The API then moves the user to the next registration step. */
export function createProfile(v: ProfileValues) {
  const place = v.place!;
  const form = new FormData(); // no Content-Type: the browser adds it, with the boundary
  const send: Record<string, string | number | null> = {
    ...textFields(v),
    ...optionalFields(v),
    latitude: place.latitude,
    longitude: place.longitude,
  };
  for (const [name, value] of Object.entries(send)) if (value !== null) form.append(name, String(value));
  form.append("logo", v.logo!);
  return apiFetch("/business-profile/me", { method: "POST", body: form });
}

/** Later saves: JSON with every field, then a new logo only if one was chosen. */
export async function updateProfile(v: ProfileValues) {
  const place = v.place!;
  // latitude and longitude must be sent together, and always are.
  await apiFetch(
    "/business-profile/me",
    jsonBody("PATCH", { ...textFields(v), ...optionalFields(v), latitude: place.latitude, longitude: place.longitude }),
  );
  if (v.logo) {
    const form = new FormData();
    form.append("logo", v.logo);
    await apiFetch("/business-profile/me/logo", { method: "PUT", body: form });
  }
}
