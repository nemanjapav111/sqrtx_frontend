"use server";

import { updateTag } from "next/cache";
import { purgeBusinessCache } from "@/lib/cloudflare-purge";
import { businessTag, feedTag, isPossibleSlug, productsTag, servicesTag } from "@/lib/public-site";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// How often one owner may make the CDN drop their pages: the free Cloudflare plan allows only 5 such calls a minute for the
// WHOLE site, so nobody (by mistake or on purpose) may use them all up. Beyond this their copies just expire by themselves.
const PURGES_PER_MINUTE = 6;
const recentPurges = new Map<string, number[]>(); // owner -> when they last made the CDN drop their pages
function mayPurge(owner: string): boolean {
  const now = Date.now();
  const recent = (recentPurges.get(owner) ?? []).filter((at) => now - at < 60_000);
  if (recent.length >= PURGES_PER_MINUTE) return false;
  recentPurges.set(owner, [...recent, now]);
  return true;
}

// Throws away what the site has saved (for up to 60 seconds, see lib/public-site.ts) of the signed-in owner's public
// page, so the next load of it shows their newest data instead of a saved older copy: right after registration is
// finished, and later after they add, edit or delete products. Visitors keep getting saved copies in between, so the
// page stays fast; only the first load after this asks the API again. The same goes for the CDN's copies, if the site is
// behind one (lib/cloudflare-purge.ts): all the owner's pages are dropped there too.
//
// Which page is theirs is NOT taken from the caller: the owner's own profile is read from the API with their access
// token, so nobody can use this to clear someone else's page. `updateTag` (not revalidateTag) because the very next
// request, the owner opening their page, must wait for fresh data instead of being handed the old copy meanwhile.
export async function refreshPublicPage(accessToken: string, previousSlug?: string): Promise<void> {
  if (!API_URL) return;
  const response = await fetch(`${API_URL}/business-profile/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return;
  const { user_id, company_url } = (await response.json()) as { user_id: string; company_url: string };

  let slug = "";
  try {
    slug = new URL(company_url).pathname.replace(/^\/+|\/+$/g, "");
  } catch {
    // no usable address: only the products can be refreshed
  }
  if (slug) updateTag(businessTag(slug));
  // The address the page had before it was changed: its saved copy must not go on showing the business for a minute.
  // Not checked against the owner: clearing a saved copy of any address only makes the next visit ask the API again.
  const old = previousSlug && previousSlug.length <= 60 ? previousSlug : "";
  if (old) updateTag(businessTag(old));
  updateTag(productsTag(user_id));
  updateTag(servicesTag(user_id));
  updateTag(feedTag); // the home page lists every business's newest products

  // The CDN's copies cost a limited call, so there the old address is only dropped if it really is nobody's now (it is the
  // address this owner just left; one somebody else holds is not theirs to clear).
  const stale = slug ? [slug] : [];
  if (old && isPossibleSlug(old.toLowerCase()) && (await isAddressFree(old))) stale.push(old);
  if (stale.length > 0 && mayPurge(user_id)) await purgeBusinessCache(stale);
}

// Is nobody at this address (the API says 404)? Any other answer, or none, counts as taken: better to leave a copy than to clear a stranger's.
async function isAddressFree(slug: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/business-profile/by-url/${encodeURIComponent(slug.toLowerCase())}`, { cache: "no-store" });
    return response.status === 404;
  } catch {
    return false;
  }
}
