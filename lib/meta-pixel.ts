// The Meta (Facebook) Pixel, used ONLY on sqrtx's own marketing and sign-up pages (/business, /register, /login) to measure our ads.
// NEVER on a business's pages (sqrtx.co/<address>, /sr/<address>), the marketplace or the account pages: those visitors belong to our customers.
// With NEXT_PUBLIC_META_PIXEL_ID unset nothing is loaded and every function here does nothing.
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

// The address without a leading language (/sr/business and /en/business are /business).
function withoutLanguage(pathname: string): string {
  return pathname.replace(/^\/(sr|en)(?=\/|$)/, "") || "/";
}

/** Is this address one of the pages the pixel may run on? */
export function isMetaPixelPage(pathname: string): boolean {
  const path = withoutLanguage(pathname);
  return path === "/business" || path === "/login" || path === "/register" || path.startsWith("/register/");
}

type Fbq = ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown; disablePushState?: boolean };
type PixelWindow = Window & { fbq?: Fbq; _fbq?: Fbq };

/** Puts Meta's standard `fbq` queue in place (the same as its base code), so calls made before fbevents.js has loaded are kept and sent later. */
export function installFbq(): void {
  const w = window as PixelWindow;
  if (w.fbq) return;
  const fbq: Fbq = function (...args: unknown[]) {
    if (fbq.callMethod) (fbq.callMethod as (...a: unknown[]) => void)(...args);
    else (fbq.queue as unknown[]).push(args);
  };
  w.fbq = fbq;
  if (!w._fbq) w._fbq = fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  // We send PageView ourselves on each allowed page; the pixel must not also send one on every history change (that would double-count, and fire on business pages).
  fbq.disablePushState = true;
}

/** Sends a standard event (for example "Lead", "CompleteRegistration"). Does nothing without the pixel, or off the allowed pages. */
export function trackMetaEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !META_PIXEL_ID) return;
  const w = window as PixelWindow;
  if (!w.fbq || !isMetaPixelPage(window.location.pathname)) return;
  try {
    if (params) w.fbq("track", name, params);
    else w.fbq("track", name);
  } catch {
    // tracking must never break the page
  }
}
