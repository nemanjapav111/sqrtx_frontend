// How a company logo is shown everywhere (registration preview, navbar, cards): fitted inside 110 x 68, proportions
// kept, never cropped and never enlarged (a blown-up small file looks blurry). The phone navbar shares its line with
// the company name and the account icon, which is why the box is this small.
export const LOGO_MAX_WIDTH = 110;
export const LOGO_MAX_HEIGHT = 68;

/**
 * The size to show a logo at, worked out from the pixel size the API sends (logo.width, logo.height).
 * Set it on the <img> so the space is reserved before the picture loads and nothing on the page jumps.
 * Returns null when the size is unknown (a logo saved before the API kept sizes): the picture then sizes itself.
 */
export function logoDisplaySize(width: number | null, height: number | null): { width: number; height: number } | null {
  if (!width || !height) return null;
  const scale = Math.min(1, LOGO_MAX_WIDTH / width, LOGO_MAX_HEIGHT / height);
  return { width: width * scale, height: height * scale };
}
