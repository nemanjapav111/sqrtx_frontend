import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Development only: the address of this computer on the local network, so a phone on the same Wi-Fi can open the dev server (Next blocks other hosts by default).
  allowedDevOrigins: ["192.168.1.6"],
  devIndicators: false,
  // Every page of a business (sqrtx.co/<address>, its product pages, and what the browser fetches when moving between them)
  // carries the label "business-<address>". A CDN in front of the site (Cloudflare) keeps the label with each copy it saves, so
  // lib/cloudflare-purge.ts can drop every saved copy of ONE business in a single call when its owner saves something. The
  // CDN removes this header before the page reaches a visitor. The address pattern is the one of lib/public-site.ts's
  // isPossibleSlug (so /_next/... files and the like get no label); the label's spelling is businessCdnTag in lib/cloudflare-purge.ts.
  async headers() {
    return [
      { source: "/:slug([a-z0-9][a-z0-9-]{1,48}[a-z0-9])/:path*", headers: [{ key: "Cache-Tag", value: "business-:slug" }] },
      // The same label on the business's pages in another language (sqrtx.co/sr/<address>, see lib/i18n.ts), so one purge drops every language's copy.
      { source: "/sr/:slug([a-z0-9][a-z0-9-]{1,48}[a-z0-9])/:path*", headers: [{ key: "Cache-Tag", value: "business-:slug" }] },
      // The landing page's pictures (public/landing/): the version is in each file's name (-1), so a changed picture gets a new name and these can be kept for a year.
      { source: "/landing/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
