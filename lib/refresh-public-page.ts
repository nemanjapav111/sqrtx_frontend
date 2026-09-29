"use server";

import { updateTag } from "next/cache";
import { businessTag, productsTag } from "@/lib/public-site";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Throws away what the site has saved (for up to 60 seconds, see lib/public-site.ts) of the signed-in owner's public
// page, so the next load of it shows their newest data instead of a saved older copy: right after registration is
// finished, and later after they add, edit or delete products. Visitors keep getting saved copies in between, so the
// page stays fast; only the first load after this asks the API again.
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
  if (previousSlug && previousSlug.length <= 60) updateTag(businessTag(previousSlug));
  updateTag(productsTag(user_id));
}
