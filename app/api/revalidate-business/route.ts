import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { purgeBusinessCache } from "@/lib/cloudflare-purge";
import { businessTag, feedTag, isPossibleSlug, productsTag, servicesTag } from "@/lib/public-site";

const API_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL;

// Called by the backend whenever a business is hidden, shown or deleted, so its saved pages (home, services, contact, about,
// product and service pages, in every language) are dropped at once instead of after the timer in lib/public-site.ts.
// POST, header "Authorization: Bearer <REVALIDATE_SECRET>", body {"slug": "<business address>"}.
// Not set up (no REVALIDATE_SECRET) means everything is refused.

// Compared as hashes so the length of the secret does not leak and the comparison takes the same time either way.
function isAuthorized(request: Request): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return false;
  const match = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "");
  if (!match) return false;
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(match[1]), hash(secret));
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return Response.json({ ok: false }, { status: 401 });

  let slug = "";
  try {
    const body = (await request.json()) as { slug?: unknown };
    if (typeof body.slug === "string") slug = body.slug.trim().toLowerCase();
  } catch {
    // not JSON: answered below
  }
  if (!isPossibleSlug(slug)) return Response.json({ ok: false }, { status: 400 });

  // The product and service lists are labelled with the owner's id, which only the API can tell from the address. Best effort:
  // a hidden or deleted business answers 404 and then only the business page and the feed are cleared (its lists are never
  // shown without the business page, which is gone).
  try {
    const response = await fetch(`${API_URL}/business-profile/by-url/${encodeURIComponent(slug)}`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      const { user_id } = (await response.json()) as { user_id?: string };
      if (user_id) {
        revalidateTag(productsTag(user_id), { expire: 0 });
        revalidateTag(servicesTag(user_id), { expire: 0 });
      }
    }
  } catch {
    // the timer is the backstop
  }
  revalidateTag(businessTag(slug), { expire: 0 });
  revalidateTag(feedTag, { expire: 0 });
  await purgeBusinessCache([slug]);

  return Response.json({ ok: true });
}
