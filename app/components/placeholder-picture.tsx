"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// A saved picture (AVIF first, WebP fallback, like API.md says) that never shows an empty hole while it downloads.
//
// (A `poster` can be given as well, see below.)
// With a `placeholder` (the API's tiny 96 px WebP, a data URI that arrives with the page's data, so no request is
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
// Whatever is behind the picture (the blurred preview, the poster, or the loading block) stays until the browser has DECODED the
// picture, not merely downloaded it (img.decode(), the way next/image removes its own blur and what MDN recommends): a picture that is
// downloaded but not decoded is not painted, and without anything behind it that was a frame with an empty box, a flash of a few
// milliseconds. The picture is drawn above what is behind it, so when it is ready in time it simply covers it and the placeholder is
// never seen; when it is not, the placeholder shows those milliseconds instead of an empty box. A picture NEVER seen before then
// fades in over it and comes into focus (the blur "developing", see FOCUS_BLUR_PX); one seen before (see `seen`) just replaces it, with no fade.
//
// `className`/`style` go on the box that holds everything, which must have a size of its own; the <img> fills it.
// 400ms with a slow start and a slow end (ease-in-out): at 300ms and a fast start the picture seemed to pop out of the blur;
// this reads as the blur "developing" into the photo.
// Premium polish (2026-10-10, the owner): 520ms with a soft landing (ease-out: it leaves quickly and settles slowly, FADE_EASING) instead of ease-in-out, a preview blurred enough to read as a wash
// of the picture's colours instead of a soft low-resolution photo (PREVIEW_BLUR_PX), and no fade at all for a picture that arrives within QUICK_MS (a cached file, or one that was
// ready before the page came alive): fading 400ms for a picture that was there at once looked like a flicker, not a polish.
const FADE_MS = 520;
const FADE_EASING = "cubic-bezier(0.22, 0.61, 0.36, 1)";
const QUICK_MS = 120;
// With a poster (the same photo, sharp, in a smaller size) there is no blur to "develop": the big picture only adds detail, so it fades
// in faster. (At 400ms switching photos in a gallery felt like half a second of waiting for the detail.)
const POSTER_FADE_MS = 200;
// The "focus pull": over a blurred preview (no poster) the real picture does not only fade in, it also comes into focus: it starts
// this blurry (CSS px) and sharpens while it fades, so the picture seems to resolve out of the preview instead of being laid over it.
// Only the opacity and the blur change, both run on the GPU. Not with a poster (that is the same photo, sharp: nothing to focus) and
// not for reduced motion (which gets no transition at all).
const FOCUS_BLUR_PX = 12;
// The preview's own blur for a big box (a card, a cover photo, a detail picture). A small box (a logo) passes less: the preview is the same 96px for every size.
const PREVIEW_BLUR_PX = 8;

// The pictures that have finished loading in this browser tab. Going to another page of the site and coming back draws
// every picture again from the start; without this each one would replay its blurred preview and its fade, although the file
// is in the browser's cache and nothing is downloaded. A picture in here is drawn without a fade: it replaces its placeholder as soon as it is decoded. It is only ever filled in the
// browser (nothing loads on the server), so the server's first HTML and the browser's first drawing of it agree.
const seen = new Set<string>();

/** A picture that was loaded somewhere else on purpose (preloaded out of sight): when it is shown it replaces its placeholder at once, with no fade. */
export const markSeen = (webp: string) => {
  seen.add(webp);
};

// Only a WebP data URI is ever put in an <img src>: whatever the API sends, nothing else can end up there.
const previewFrom = (placeholder: string | null | undefined) =>
  placeholder?.startsWith("data:image/webp;base64,") ? placeholder : null;

/**
 * The width and height of the preview, read from the first bytes of the WebP file itself (its three formats: lossy, lossless, extended), so the blurred preview can be
 * drawn in exactly the picture's own shape, with no blurred "halo" around it, and it can be done in the server-rendered HTML too (no waiting for the image to load).
 * Null when the file is not what it should be: the preview is then drawn the old way.
 */
function webpSize(dataUri: string): { w: number; h: number } | null {
  try {
    const bytes = atob(dataUri.slice("data:image/webp;base64,".length, "data:image/webp;base64,".length + 48));
    const b = (i: number) => bytes.charCodeAt(i);
    if (bytes.slice(0, 4) !== "RIFF" || bytes.slice(8, 12) !== "WEBP") return null;
    const kind = bytes.slice(12, 16);
    let w = 0;
    let h = 0;
    if (kind === "VP8 ") {
      w = (b(26) | (b(27) << 8)) & 0x3fff;
      h = (b(28) | (b(29) << 8)) & 0x3fff;
    } else if (kind === "VP8L") {
      w = 1 + (b(21) | ((b(22) & 0x3f) << 8));
      h = 1 + ((b(22) >> 6) | (b(23) << 2) | ((b(24) & 0x0f) << 10));
    } else if (kind === "VP8X") {
      w = 1 + (b(24) | (b(25) << 8) | (b(26) << 16));
      h = 1 + (b(27) | (b(28) << 8) | (b(29) << 16));
    }
    return w > 0 && h > 0 ? { w, h } : null;
  } catch {
    return null;
  }
}

/**
 * The AVIF source of a picture: with an `avif3x` file it lists two candidates by density ("2x" and "3x"), so the browser takes the larger file only on a
 * screen denser than 2x (iPhones, most recent Androids, foldables) and never downloads it on a desktop or a 2x phone. Without one, the plain file.
 * The WebP in the <img> is the fallback for a browser that cannot read AVIF, and it is the same file for every density.
 */
export const avifSourceSet = (avif: string, avif3x?: string | null) => (avif3x ? `${avif} 2x, ${avif3x} 3x` : avif);

export default function PlaceholderPicture({
  avif,
  avif3x,
  webp,
  alt,
  placeholder,
  poster,
  className,
  style,
  loading,
  imgClassName = "size-full",
  blurPx = PREVIEW_BLUR_PX,
  blockClassName,
  sweep = true,
}: {
  avif: string;
  // The same picture at three times its box (AVIF only): see avifSourceSet. Pictures saved before it existed have none.
  avif3x?: string | null;
  webp: string;
  alt: string;
  // The API's tiny WebP data URI. Null/undefined or in another format: the loading block below is used instead.
  placeholder?: string | null;
  // A smaller version of the same picture that may already be in the browser (for example the card size while the big
  // size loads). Drawn sharp, over the blurred preview and under the real picture, and removed with them once the real one
  // has faded in. The blurred preview is only there until the poster has loaded (it shows through if the poster hasn't
  // arrived), and then it goes: left under a poster it would show as a blurred edge around a picture that is shown whole.
  // `avif3x`: the poster's own x3 file, so that a screen denser than 2x takes the SAME file the page it came from showed (the list's card3x, the page's detail3x),
  // which is already in the browser's cache, and not the 2x one, which would be a new download.
  poster?: { avif: string; avif3x?: string | null; webp: string } | null;
  className?: string;
  style?: React.CSSProperties;
  loading?: "eager" | "lazy";
  imgClassName?: string;
  // How strongly the preview is blurred, in CSS pixels (default PREVIEW_BLUR_PX): smaller for a small box like the logo's.
  blurPx?: number;
  // Only for the loading block (no preview): replaces its position and colour (`inset-0` + light grey). For a
  // picture inside a padded card, so the block can cover the whole card in the card's own colour and only the sweep
  // shows.
  blockClassName?: string;
  // The light streak that moves over the loading block (no preview). Off: the block stays plain.
  sweep?: boolean;
}) {
  const preview = previewFrom(placeholder);
  const previewSize = preview ? webpSize(preview) : null;
  const under = !!preview || !!poster; // something is drawn under the real picture until it has been decoded
  const img = useRef<HTMLImageElement>(null);
  const posterImg = useRef<HTMLImageElement>(null);
  const [posterLoaded, setPosterLoaded] = useState(false);
  // The poster counts as ready only once the browser has DECODED it, not merely downloaded it: the blurred preview goes the moment it is
  // ready, and a picture that is downloaded but not yet decoded is not painted, so between the two there was a frame with nothing (an
  // empty box, a flash of a few milliseconds that showed on opening a product). decode() resolves when it can be painted at once; if it
  // fails the preview simply stays.
  const posterReady = () => {
    const el = posterImg.current;
    if (!el) return;
    el.decode().then(() => setPosterLoaded(true), () => undefined);
  };
  // Loaded before (see `seen`): it does not fade in, it replaces what is behind it as soon as it is decoded.
  const [seenBefore] = useState(() => seen.has(webp));
  const fadeMs = poster ? POSTER_FADE_MS : FADE_MS;
  // The picture is decoded and can be painted at once (see the comment on top).
  const [decoded, setDecoded] = useState(false);
  // It was ready within QUICK_MS of this component coming alive (a cached file, or one the browser had before the page hydrated): it then replaces its preview at once, with no fade.
  const [quick, setQuick] = useState(false);
  const born = useRef(0);
  // This picture fades in: not one seen before, not a quick one.
  const fade = !seenBefore && !quick;
  // A fading picture: the fade is over, what is behind it can go.
  const [faded, setFaded] = useState(false);
  const decodedNow = useCallback(() => {
    const el = img.current;
    if (!el) return;
    // decode() rejects if the picture cannot be decoded: whatever is behind it then stays.
    el.decode().then(
      () => {
        seen.add(webp);
        if (performance.now() - born.current < QUICK_MS) setQuick(true);
        setDecoded(true);
      },
      () => undefined,
    );
  }, [webp]);

  useEffect(() => {
    born.current = performance.now();
    if (img.current?.complete && img.current.naturalWidth > 0) decodedNow();
  }, [decodedNow]);
  useEffect(() => {
    if (posterImg.current?.complete && posterImg.current.naturalWidth > 0) posterReady();
  }, [poster?.webp]); // only a different poster FILE matters: the page makes a new object with the same files each time it draws
  useEffect(() => {
    if (!decoded || !fade || faded) return;
    const timer = setTimeout(() => setFaded(true), fadeMs + 50);
    return () => clearTimeout(timer);
  }, [decoded, fade, faded, fadeMs]);
  // What is behind the picture goes: at once when it is decoded, or when its fade is over.
  const behindGone = decoded && (!fade || faded);
  // The real picture is coming into focus (see FOCUS_BLUR_PX): from the moment it is rendered until its fade is over.
  const focusing = !!preview && !poster && fade && !faded;

  return (
    <div className={`relative ${className ?? ""}`} style={style}>
      {under ? (
        !behindGone && (
          <div aria-hidden className="absolute inset-0 overflow-hidden">
            {preview && !(poster && posterLoaded) && (
              // The preview is drawn in exactly the shape of the picture (its own width : height, read from the file: `webpSize`), fitted into the box the way the real picture will be
              // (whole, or covering it with object-cover), and blurred INSIDE that shape: the picture is enlarged a little behind a clip, so the blur has nothing transparent to
              // fade into at the edges. Before, the blurred image spread past the picture's edge into the empty space around it, like a soft shadow, and its own edges went pale.
              // The blur grows with the box (2.4% of its width, from 1px up to `blurPx`: a 350px card gets the full 8px, a 100px logo about 2px, a thumbnail 1px), so one value suits every
              // size; the wrapper is the "container" those widths are measured in (its size is the box's, it takes no room of its own).
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ containerType: "size" }}>
                <div
                  className="overflow-hidden"
                  style={
                    previewSize && !imgClassName.includes("object-cover")
                      ? { width: `min(100cqw, calc(100cqh * ${previewSize.w / previewSize.h}))`, height: `min(100cqh, calc(100cqw * ${previewSize.h / previewSize.w}))` }
                      : { width: "100%", height: "100%" }
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt=""
                    className={previewSize ? `size-full ${imgClassName.includes("object-cover") ? "object-cover" : ""}` : imgClassName}
                    style={{ filter: `blur(clamp(1px, 2.4cqw, ${blurPx}px))`, transform: "scale(1.12)", ...(previewSize ? null : { clipPath: "inset(0)", transform: undefined }) }}
                  />
                </div>
              </div>
            )}
            {poster && (
              <picture className="absolute inset-0">
                <source srcSet={avifSourceSet(poster.avif, poster.avif3x)} type="image/avif" />
                <img ref={posterImg} src={poster.webp} alt="" onLoad={posterReady} className={imgClassName} />
              </picture>
            )}
          </div>
        )
      ) : (
        !decoded && (
          <div
            aria-hidden
            className={`${sweep ? "glass-shimmer" : ""} absolute overflow-hidden ${blockClassName ?? "inset-0 bg-[#f3f4f6]"}`}
          />
        )
      )}
      <picture className="contents">
        <source srcSet={avifSourceSet(avif, avif3x)} type="image/avif" />
        <img
          ref={img}
          src={webp}
          alt={alt}
          // A picture seen before is never lazy either: its file is in the browser's cache, and a new lazy element is only started after
          // the page has been laid out, a moment in which it would show an empty box.
          loading={seenBefore ? "eager" : loading}
          // A picture seen before is drawn again as a NEW element (going back to a page rebuilds it) and is decoded again, which took 8
          // to 60 ms for a 604px card picture and more for a big one: "sync" asks the browser to decode before painting. (In Chrome
          // and Safari that is already the default; "async" is what lets an empty box show.) One not seen yet keeps "async": its
          // placeholder is on screen meanwhile and decoding must not hold the page. Either way it stays hidden behind nothing:
          // the placeholder stays until decode() has finished (see the comment on top).
          decoding={seenBefore ? "sync" : "async"}
          onLoad={decodedNow}
          // Only a fading picture is invisible until it is decoded, then fades in. One that is not fading is simply drawn: above
          // the placeholder when it is ready, and not drawn at all (the placeholder shows) when it is not.
          className={`relative ${imgClassName} ${
            under && fade ? (focusing ? "transition-[opacity,filter] motion-reduce:transition-none" : "transition-opacity motion-reduce:transition-none") : ""
          } ${under && fade && !decoded ? "opacity-0" : ""}`}
          // While focusing it is blurred until decoded, then sharp (the transition between the two is the focus pull). clip-path keeps the
          // blur from spreading past the box. Once the fade is over the filter is removed altogether (a filter of 0 would still keep a layer).
          style={
            under && fade
              ? { transitionDuration: `${fadeMs}ms`, transitionTimingFunction: FADE_EASING, ...(focusing ? { filter: `blur(${decoded ? 0 : FOCUS_BLUR_PX}px)`, clipPath: "inset(0)" } : null) }
              : undefined
          }
        />
      </picture>
    </div>
  );
}
