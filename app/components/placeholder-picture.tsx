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
const FADE_MS = 400;
// With a poster (the same photo, sharp, in a smaller size) there is no blur to "develop": the big picture only adds detail, so it fades
// in faster. (At 400ms switching photos in a gallery felt like half a second of waiting for the detail.)
const POSTER_FADE_MS = 200;
// The "focus pull": over a blurred preview (no poster) the real picture does not only fade in, it also comes into focus: it starts
// this blurry (CSS px) and sharpens while it fades, so the picture seems to resolve out of the preview instead of being laid over it.
// Only the opacity and the blur change, both run on the GPU. Not with a poster (that is the same photo, sharp: nothing to focus) and
// not for reduced motion (which gets no transition at all).
const FOCUS_BLUR_PX = 8;

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
  blurPx = 0.5,
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
  const fade = !seenBefore;
  const fadeMs = poster ? POSTER_FADE_MS : FADE_MS;
  // The picture is decoded and can be painted at once (see the comment on top).
  const [decoded, setDecoded] = useState(false);
  // A fading picture: the fade is over, what is behind it can go.
  const [faded, setFaded] = useState(false);
  const decodedNow = useCallback(() => {
    const el = img.current;
    if (!el) return;
    // decode() rejects if the picture cannot be decoded: whatever is behind it then stays.
    el.decode().then(
      () => {
        seen.add(webp);
        setDecoded(true);
      },
      () => undefined,
    );
  }, [webp]);

  useEffect(() => {
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
            under && fade ? (focusing ? "transition-[opacity,filter] ease-in-out motion-reduce:transition-none" : "transition-opacity ease-in-out motion-reduce:transition-none") : ""
          } ${under && fade && !decoded ? "opacity-0" : ""}`}
          // While focusing it is blurred until decoded, then sharp (the transition between the two is the focus pull). clip-path keeps the
          // blur from spreading past the box. Once the fade is over the filter is removed altogether (a filter of 0 would still keep a layer).
          style={
            under && fade
              ? { transitionDuration: `${fadeMs}ms`, ...(focusing ? { filter: `blur(${decoded ? 0 : FOCUS_BLUR_PX}px)`, clipPath: "inset(0)" } : null) }
              : undefined
          }
        />
      </picture>
    </div>
  );
}
