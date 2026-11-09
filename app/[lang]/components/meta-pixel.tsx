"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { META_PIXEL_ID, installFbq, isMetaPixelPage } from "@/lib/meta-pixel";

// Loads the Meta Pixel on sqrtx's marketing and sign-up pages only (see lib/meta-pixel.ts) and sends PageView for the first page and for
// every client-side move to one of them. Mounted once in the root layout.
export default function MetaPixel() {
  const pathname = usePathname();
  const allowed = !!META_PIXEL_ID && isMetaPixelPage(pathname);
  const lastTracked = useRef<string | null>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (!allowed) {
      lastTracked.current = null; // coming back to an allowed page later is a new view
      return;
    }
    if (lastTracked.current === pathname) return; // no double PageView (React strict mode, re-renders)
    lastTracked.current = pathname;
    installFbq();
    const w = window as unknown as { fbq: (...args: unknown[]) => void };
    if (!initialised.current) {
      initialised.current = true;
      w.fbq("init", META_PIXEL_ID);
    }
    w.fbq("track", "PageView");
  }, [allowed, pathname]);

  if (!allowed) return null;
  return (
    <>
      <Script id="meta-pixel-lib" src="https://connect.facebook.net/en_US/fbevents.js" strategy="afterInteractive" />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  );
}
