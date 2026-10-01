import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page of a business (sqrtx.co/<address>, its product pages, and what the browser fetches when moving between them)
  // carries the label "business-<address>". A CDN in front of the site (Cloudflare) keeps the label with each copy it saves, so
  // lib/cloudflare-purge.ts can drop every saved copy of ONE business in a single call when its owner saves something. The
  // CDN removes this header before the page reaches a visitor. The address pattern is the one of lib/public-site.ts's
  // isPossibleSlug (so /_next/... files and the like get no label); the label's spelling is businessCdnTag in lib/cloudflare-purge.ts.
  async headers() {
    return [{ source: "/:slug([a-z0-9][a-z0-9-]{1,48}[a-z0-9])/:path*", headers: [{ key: "Cache-Tag", value: "business-:slug" }] }];
  },
};

export default nextConfig;
