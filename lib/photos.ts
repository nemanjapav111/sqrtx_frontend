// Shared, product/service-agnostic handling for a picked (not-yet-uploaded) photo: what the API accepts, shrinking
// it in the browser before upload, and drawing preview thumbnails. Used by both the product and service forms.

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // what the API takes, checked AFTER the photo has been shrunk

// Phone photos are often 20 MB or more, but nothing on the site is bigger than 2400 px (the full size is the picture as uploaded), so every photo is shrunk in the
// browser before it is uploaded: long side at most 2400 px (the server keeps a 2400 px master, see the API notes),
// as a WebP at quality 0.9. That is about 1 MB, so the upload takes a second instead of many.
export const UPLOAD_MAX_SIDE = 2400;
export const UPLOAD_QUALITY = 0.9;
// A photo that is already small and light goes up untouched.
export const KEEP_AS_IS_BYTES = 1.5 * 1024 * 1024;
// Refuse absurd files before reading them into memory (the shrinking needs the photo decoded).
export const MAX_PICKED_BYTES = 100 * 1024 * 1024;

// A photo the user picked, waiting to be uploaded. The id only tells the photos apart on screen.
export interface PickedPhoto {
  id: string;
  file: File;
}

// A photo that is already saved on the server (when editing a product): the id is the API's image id, the url a
// picture to draw it from (the card size, see API.md). It is never uploaded again.
export interface SavedPhoto {
  id: string;
  url: string;
  name: string; // only for the alt text and the remove button's label
}

// What the photo zone holds: photos picked just now and, when editing, photos that are already saved.
export type ZonePhoto = PickedPhoto | SavedPhoto;
export const isSaved = (photo: ZonePhoto): photo is SavedPhoto => "url" in photo;

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
 *   - shrinking would not make it smaller, or
 *   - `keepTransparency` is set (a logo, which may be see-through) and this browser can't make WebP: the JPEG on white it would
 *     fall back to would change the logo, so the logo goes up as it is.
 * With `keepIfLighterThan` (a logo) a file at most that heavy goes up untouched whatever its size in pixels: it uploads fast anyway, and
 * every re-sizing is a small loss for a crisp logo. Never throws.
 */
export async function shrinkPhoto(file: File, options: { keepTransparency?: boolean; keepIfLighterThan?: number } = {}): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file); // applies the rotation stored in the photo
  } catch {
    return file;
  }
  try {
    const longSide = Math.max(bitmap.width, bitmap.height);
    const light = options.keepIfLighterThan !== undefined ? file.size <= options.keepIfLighterThan : longSide <= UPLOAD_MAX_SIDE && file.size <= KEEP_AS_IS_BYTES;
    if (light) return file;
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
      if (options.keepTransparency) return file;
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

// The picture a visitor searches BY (the camera button of the marketplace's search box, app/home/photo-search.tsx): the model looks at it at about 256 x 256
// pixels, so the long side is shrunk to 512 px and it goes up as a JPEG (on white: a see-through PNG would otherwise get a black background), about 30 to 80 KB
// instead of a phone photo's 5 MB. A browser that cannot read the file (HEIC in most browsers) sends it as it is: the server reads those. Never throws.
export const SEARCH_PHOTO_SIDE = 512;
export async function shrinkForSearch(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file); // applies the rotation stored in the photo
  } catch {
    return file;
  }
  try {
    const scale = Math.min(1, SEARCH_PHOTO_SIDE / Math.max(bitmap.width, bitmap.height)); // never enlarged
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await toBlob(canvas, "image/jpeg", 0.85);
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^./\\]+$/, "")}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}
