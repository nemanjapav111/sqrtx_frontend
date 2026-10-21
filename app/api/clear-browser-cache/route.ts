// Asks the browser to throw away its saved copies of this site's pages and files (not the pictures: they come from img.sqrtx.co, another address).
// Called after an owner's save (refreshMyPublicPage in lib/onboarding.ts), so a page and a product they just saved are asked for again instead of shown from the copy the browser kept.
export function POST() {
  return new Response(null, { status: 204, headers: { "Clear-Site-Data": '"cache"', "Cache-Control": "private, no-store" } });
}
