"use client";

import { useEffect, useRef, useState } from "react";
import { STATIC_MAP_HEIGHT, STATIC_MAP_WIDTH } from "@/lib/static-map";
import MapEmbed from "./map-embed";

// The map of the Contact page: a picture of the neighbourhood in the site's greys with a red pin at the business's position (one image of about
// 45 KB from Google's Static Maps, no script, so it is just there: no "Show map" button to press), under it a black "Get directions" button that
// opens Google Maps (the app on a phone) with the route to the business. The picture itself is a link that opens the place in Google Maps.
// When there is no picture (the site has no Google key, or Google refuses the request: the Static Maps service is not switched on for the key, or
// the key's limits are reached) the OpenStreetMap map behind its "Show map" button (map-embed.tsx) takes its place, so the page never shows a broken
// picture. Not in the design: the map is the design's grey 500 x 250 box, the button is the site's black button.
export default function ContactMap({
  imageSrc,
  desktopImageSrc,
  osmSrc,
  title,
  viewHref,
  directionsHref,
}: {
  imageSrc: string | null; // the Google map picture (500 x 250), or null when there is no key
  desktopImageSrc?: string | null; // the taller one (500 x 438) for a desktop, where the map is as tall as the rows
  osmSrc: string; // OpenStreetMap's embedded map, the fallback
  title: string;
  viewHref: string;
  directionsHref: string;
}) {
  const [failed, setFailed] = useState(false);
  const picture = useRef<HTMLImageElement>(null);
  // The picture can fail before this component has hydrated (it is in the server's HTML): then onError never fires, so look at it once here.
  useEffect(() => {
    const el = picture.current;
    if (el?.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  const directions = (
    <a
      href={directionsHref}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-10.25 w-full items-center justify-center bg-black text-[16px] leading-[1.21] font-bold text-white"
    >
      Get directions
    </a>
  );

  if (!imageSrc || failed) {
    return (
      <div className="flex flex-col gap-3 @min-[1030px]:w-125 @min-[1030px]:shrink-0">
        <MapEmbed src={osmSrc} title={title} />
        {directions}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 @min-[1030px]:w-125 @min-[1030px]:shrink-0">
      <a
        href={viewHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${title}: open in Google Maps`}
        className="relative block h-62.5 w-full overflow-hidden bg-[#f3f4f6] @min-[1030px]:h-109.5"
      >
        {/* A desktop (from 1110px of window, where the content is 1030px wide) takes the taller picture; only the one it needs is downloaded. */}
        <picture>
          {desktopImageSrc && <source media="(min-width: 1110px)" srcSet={desktopImageSrc} />}
          <img
            ref={picture}
            src={imageSrc}
            alt={title}
            width={STATIC_MAP_WIDTH}
            height={STATIC_MAP_HEIGHT}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="absolute inset-0 size-full object-cover"
          />
        </picture>
      </a>
      {directions}
    </div>
  );
}
