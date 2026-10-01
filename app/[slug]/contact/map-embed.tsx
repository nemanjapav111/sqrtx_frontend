"use client";

import { useEffect, useRef, useState } from "react";
import { preconnect } from "react-dom";

// The map of the Contact page, loaded only when the visitor asks for it. OpenStreetMap's embedded map is a whole page of its own (about
// 345 KB of script and style, then the map pictures), and most visitors come for the phone number or the address, so until the button is
// pressed there is only a grey box (no request to openstreetmap.org at all). Pressing it shows the real map at once: the connection to
// OpenStreetMap is started when a finger or the pointer comes to the button, so it is already open when it is pressed.
// Not in the design: the grey box, the pin and the button follow the site's own look (the grey of the services' photos, the black button of "See More").
const BOX = "h-62.5 w-full @min-[1030px]:w-125 @min-[1030px]:shrink-0";

export default function MapEmbed({ src, title }: { src: string; title: string }) {
  const [shown, setShown] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  // The button is gone once the map is there: the keyboard goes on from the map, not from the top of the page.
  useEffect(() => {
    if (shown) frame.current?.focus();
  }, [shown]);

  if (shown) {
    return <iframe ref={frame} src={src} title={title} referrerPolicy="no-referrer" className={`${BOX} border-0`} />;
  }

  const warm = () => {
    preconnect("https://www.openstreetmap.org");
    preconnect("https://tile.openstreetmap.org", { crossOrigin: "anonymous" });
  };
  return (
    <div className={`${BOX} flex flex-col items-center justify-center gap-3 bg-[#f3f4f6]`}>
      <svg aria-hidden viewBox="0 0 24 24" className="size-8" fill="none" stroke="#4b5563" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
        <circle cx="12" cy="10" r="2.3" />
      </svg>
      <button
        type="button"
        onClick={() => setShown(true)}
        onPointerEnter={warm}
        onTouchStart={warm}
        onFocus={warm}
        className="flex h-10.25 w-48 cursor-pointer items-center justify-center bg-black text-[16px] leading-[1.21] font-bold text-white"
      >
        Show map
      </button>
    </div>
  );
}
