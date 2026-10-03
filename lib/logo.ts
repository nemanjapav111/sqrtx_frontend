// How a company logo is shown everywhere (registration preview, navbar, cards): fitted inside 110 x 68, proportions
// kept, never cropped and never enlarged (a blown-up small file looks blurry). The phone navbar shares its line with
// the company name and the account icon, which is why the box is this small.
export const LOGO_MAX_WIDTH = 110;
export const LOGO_MAX_HEIGHT = 68;

// Fits a logo inside 110 x 68 by itself, with no JS math: for when its real pixel size isn't known yet (a freshly
// chosen file, before its dimensions are read, or an old saved logo from before the API kept sizes). A block, not a
// flex item: a flex item shrinks to max-width but not to max-height, which would squash it. Used as a fallback next
// to `logoDisplaySize`'s exact pixel size (below), which every place a saved logo is shown prefers when it can.
export const LOGO_FIT_CLASS = "block h-auto max-h-17 w-auto max-w-27.5";

/**
 * The size to show a logo at, worked out from the pixel size the API sends (logo.width, logo.height).
 * Set it on the <img> so the space is reserved before the picture loads and nothing on the page jumps.
 * Returns null when the size is unknown (a logo saved before the API kept sizes): the picture then sizes itself.
 */
export function logoDisplaySize(
  width: number | null,
  height: number | null,
  maxWidth = LOGO_MAX_WIDTH,
  maxHeight = LOGO_MAX_HEIGHT,
): { width: number; height: number } | null {
  if (!width || !height) return null;
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return { width: width * scale, height: height * scale };
}
