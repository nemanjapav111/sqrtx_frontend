// Drops a CDN's saved copies of a business's public pages (Cloudflare, once the site is behind it): the CDN may keep a page
// for a long time, so when its owner saves something the copies must go, or visitors keep seeing the old page. Every page of a
// business carries the label "business-<address>" (next.config.ts), and Cloudflare can drop everything with a label in one call
// ("purge by cache tag", on every Cloudflare plan; on the free plan at most 5 such calls per minute, so this is for owner saves,
// not for every visit). Not connected to a CDN (the two settings below missing, as in development) it does nothing.
//
// Settings, on the server only (never NEXT_PUBLIC_): CLOUDFLARE_ZONE_ID (the site's zone) and CLOUDFLARE_API_TOKEN (a token with
// only the "Cache Purge" permission for that zone). CLOUDFLARE_API_URL is only for trying this against a fake server.
//
// Best effort, like the rest of the clearing of saved pages: if Cloudflare can't be reached or says no (for example the rate
// limit), the copies simply expire by themselves, so this must never fail the save it follows.

/** The label every page of this business carries; must spell the same as the header in next.config.ts. */
export const businessCdnTag = (slug: string) => `business-${slug.toLowerCase()}`;

export async function purgeBusinessCache(slugs: string[]): Promise<void> {
  const zone = process.env.CLOUDFLARE_ZONE_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const tags = [...new Set(slugs.filter(Boolean).map(businessCdnTag))];
  if (!zone || !token || tags.length === 0) return;

  try {
    const base = process.env.CLOUDFLARE_API_URL ?? "https://api.cloudflare.com/client/v4";
    const response = await fetch(`${base}/zones/${encodeURIComponent(zone)}/purge_cache`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(3000), // the owner is waiting for their save to finish
    });
    if (!response.ok) console.error(`Cloudflare cache purge was refused (HTTP ${response.status}); the copies will expire by themselves.`);
  } catch (error) {
    console.error("Cloudflare cache purge failed; the copies will expire by themselves:", error instanceof Error ? error.message : error);
  }
}
