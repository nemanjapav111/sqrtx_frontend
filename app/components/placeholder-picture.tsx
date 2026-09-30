"use client";

import { useEffect, useRef, useState } from "react";

// A saved picture (AVIF first, WebP fallback, like API.md says) that never shows an empty hole while it downloads.
//
// (A `poster` can be given as well, see below.)
// With a `placeholder` (the API's tiny 48 px WebP, a data URI that arrives with the page's data, so no request is
// needed and it is already in the server-rendered HTML): it is drawn at once, softly blurred and scaled up, and the real
// picture fades in over it when it has loaded ("blur-up"). The preview is removed once the fade is done, so it can't
// show through a transparent logo. Anything that is not such a data URI (for example a placeholder in an older format)
// is treated as no placeholder at all.
//
// Without one (a picture saved before the API made previews): a plain light block with a light streak sweeping over
// it (globals.css), removed the moment the picture loads. The picture itself is never hidden in that case.
//
// The image can finish loading before this component hydrates (it is server-rendered), and then `onLoad` never
// fires: the effect catches that case. A picture that fails to load keeps whatever is behind it.
//
// `className`/`style` go on the box that holds everything, which must have a size of its own; the <img> fills it.
// 400ms with a slow start and a slow end (ease-in-out): at 300ms and a fast start the picture seemed to pop out of the blur;
// this reads as the blur "developing" into the photo.
const FADE_MS = 400;

// The pictures that have finished loading in this browser tab. Going to another page of the site and coming back draws
// every picture again from the start; without this each one would replay its blurred preview and its fade, although the file
// is in the browser's cache and nothing is downloaded. A picture in here is drawn as it is, at once. It is only ever filled in the
// browser (nothing loads on the server), so the server's first HTML and the browser's first drawing of it agree.
const seen = new Set<string>();

// Only a WebP data URI is ever put in an <img src>: whatever the API sends, nothing else can end up there.
const previewFrom = (placeholder: string | null | undefined) =>
  placeholder?.startsWith("data:image/webp;base64,") ? placeholder : null;

export default function PlaceholderPicture({
  avif,
  webp,
  alt,
  placeholder,
  poster,
  className,
  style,
  loading,
  imgClassName = "size-full",
  blurPx = 1,
  blockClassName,
  sweep = true,
}: {
  avif: string;
  webp: string;
  alt: string;
  // The API's tiny WebP data URI. Null/undefined or in another format: the loading block below is used instead.
  placeholder?: string | null;
  // A smaller version of the same picture that may already be in the browser (for example the card size while the big
  // size loads). Drawn sharp, over the blurred preview and under the real picture, and removed with them once the real one
  // has faded in. The blurred preview is only there until the poster has loaded (it shows through if the poster hasn't
  // arrived), and then it goes: left under a poster it would show as a blurred edge around a picture that is shown whole.
  poster?: { avif: string; webp: string } | null;
  className?: string;
  style?: React.CSSProperties;
  loading?: "eager" | "lazy";
  imgClassName?: string;
  // How strongly the preview is blurred, in CSS pixels, to hide its blockiness: smaller for a small box like the logo's.
  blurPx?: number;
  // Only for the loading block (no preview): replaces its position and colour (`inset-0` + light grey). For a
  // picture inside a padded card, so the block can cover the whole card in the card's own colour and only the sweep
  // shows.
  blockClassName?: string;
  // The light streak that moves over the loading block (no preview). Off: the block stays plain.
  sweep?: boolean;
}) {
  const preview = previewFrom(placeholder);
  const under = !!preview || !!poster; // something is drawn under the real picture until it has loaded
  const img = useRef<HTMLImageElement>(null);
  const posterImg = useRef<HTMLImageElement>(null);
  const [posterLoaded, setPosterLoaded] = useState(false);
  // Loaded before (see `seen`): nothing to wait for or fade.
  const [seenBefore] = useState(() => seen.has(webp));
  const [loaded, setLoaded] = useState(seenBefore);
  // The fade is over: the preview can go.
  const [faded, setFaded] = useState(seenBefore);

  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth > 0) {
      seen.add(webp);
      setLoaded(true);
    }
  }, [webp]);
  useEffect(() => {
    if (posterImg.current?.complete && posterImg.current.naturalWidth > 0) setPosterLoaded(true);
  }, [poster]);
  useEffect(() => {
    if (!loaded || faded) return;
    const timer = setTimeout(() => setFaded(true), FADE_MS + 50);
    return () => clearTimeout(timer);
  }, [loaded, faded]);

  return (
    <div className={`relative ${className ?? ""}`} style={style}>
      {under ? (
        !faded && (
          <div aria-hidden className="absolute inset-0 overflow-hidden">
            {preview && !(poster && posterLoaded) && (
              // An <img> of the data URI, not a CSS background: it follows the picture's own fit (object-contain), so it
              // covers exactly the area the real picture will. It is NOT enlarged (it was, to hide the soft, see-through
              // edges a blur leaves, which showed as a blurred frame around a picture that is shown whole), and clip-path
              // cuts off what the blur spreads past the box, so the preview is never larger than the picture.
              <div className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt=""
                  className={imgClassName}
                  style={{ filter: `blur(${blurPx}px)`, clipPath: "inset(0)" }}
                />
              </div>
            )}
            {poster && (
              <picture className="absolute inset-0">
                <source srcSet={poster.avif} type="image/avif" />
                <img ref={posterImg} src={poster.webp} alt="" onLoad={() => setPosterLoaded(true)} className={imgClassName} />
              </picture>
            )}
          </div>
        )
      ) : (
        !loaded && (
          <div
            aria-hidden
            className={`${sweep ? "glass-shimmer" : ""} absolute overflow-hidden ${blockClassName ?? "inset-0 bg-[#f3f4f6]"}`}
          />
        )
      )}
      <picture className="contents">
        <source srcSet={avif} type="image/avif" />
        <img
          ref={img}
          src={webp}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={() => {
            seen.add(webp);
            setLoaded(true);
          }}
          className={`relative ${imgClassName} ${under && !seenBefore ? "transition-opacity ease-in-out" : ""} ${
            under && !loaded ? "opacity-0" : ""
          }`}
          style={under && !seenBefore ? { transitionDuration: `${FADE_MS}ms` } : undefined}
        />
      </picture>
    </div>
  );
}
