// How a company logo is shown everywhere (registration preview, navbar, cards): fitted inside 110 x 68, proportions
// kept, never cropped and never enlarged (a blown-up small file looks blurry). The phone navbar shares its line with
// the company name and the account icon, which is why the box is this small.
export const LOGO_MAX_WIDTH = 110;
export const LOGO_MAX_HEIGHT = 68;

// Fits a logo inside 110 x 68 by itself, with no JS math: for when its real pixel size isn't known yet (a freshly
// chosen file, before its dimensions are read, or an old saved logo from before the API kept sizes). A block, not a
// flex item: a flex item shrinks to max-width but not to max-height, which would squash it. Used as a fallback next
// to `logoDisplaySize`'s exact pixel size (below), which every place a saved logo is shown prefers when it can.
// Where a logo is shown in a 68px row (a business's top bar, the company block of the marketplace): fitted inside 100 x 58, so a wide logo keeps
// 5px of air above and below it instead of touching the row's edges, and a square one is 58 x 58. (The first version of this made it 58 x 58 for every
// logo; a wide logo is then only 36px high, too small to read.)
export const LOGO_ROW_MAX_WIDTH = 100;
export const LOGO_ROW_MAX_HEIGHT = 58;
export const LOGO_ROW_FIT_CLASS = "block h-auto max-h-[58px] w-auto max-w-[100px]";

export const LOGO_FIT_CLASS = "block h-auto max-h-17 w-auto max-w-27.5";

/**
 * For the phone's and the tablet's top bar, where every logo fills the bar's whole height (2026-10-10, the owner): the size that makes the logo exactly 68px high, unless that
 * would be wider than `maxWidth` (130, kept as the owner asked; then it is as wide as that and so lower than 68px, only for a logo wider than about 1.9 : 1). The API only accepts a logo of 220 x 136 at least
 * on one side (twice the box) and stores it fitted inside 390 x 204 (three times the largest box), so a logo is never enlarged here by more than `maxEnlarge`. Returns null when the size is unknown.
 */
export function logoFillSize(width: number | null, height: number | null, maxWidth = 130, maxHeight = LOGO_MAX_HEIGHT, maxEnlarge = 1.2): { width: number; height: number } | null {
  if (!width || !height) return null;
  const scale = Math.min(maxEnlarge, maxWidth / width, maxHeight / height);
  return { width: width * scale, height: height * scale };
}

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
