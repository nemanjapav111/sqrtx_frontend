"use client";

import { useEffect, useRef } from "react";
import PlaceholderPicture, { markSeen } from "@/app/components/placeholder-picture";
import type { PublicProductImage } from "@/lib/public-site";
import ZoomStage from "./zoom-stage";

// The photo viewer: the product page's big photo, opened over the whole window (click the photo) in the "full" size the API makes
// (up to 1920px, which nothing else on the site used), as large as the window allows, shown whole on a dark ground. The page's own
// photo is shown at most 450px tall, so a visitor who wants to look at the detail had nothing to look at.
// Not in the designs: a plain viewer, placeholder look. The photo can be zoomed and moved (zoom-stage.tsx). It closes with the x,
// Escape, or a click on the dark ground around the photo; the arrows (and the left and right keys, when the photo is not zoomed) go
// round the product's photos; "n / total" says which one is shown. While it is open the page behind does not scroll, the focus stays
// inside it, and closing it returns the focus to the photo that was clicked.
// The detail size (already on the page, already decoded) is the poster under the full one, so opening is instant and the photo only
// gets sharper when the full one has loaded. The neighbours' full sizes are loaded out of sight, so an arrow shows the next one at
// once (and, once loaded, counts as seen: it replaces its poster with no fade, see placeholder-picture.tsx).
export default function PhotoViewer({
  images,
  index,
  name,
  onStep,
  onClose,
}: {
  images: PublicProductImage[];
  index: number;
  name: string;
  onStep: (by: number) => void;
  onClose: () => void;
}) {
  const image = images[index];
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  // The page behind stays still while the viewer is open. Its scrollbar goes with the scrolling, and the page behind does not move
  // when it goes (see keep-width in globals.css).
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = before;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key === "ArrowLeft") return onStep(-1);
      if (e.key === "ArrowRight") return onStep(1);
      // Tab goes round the viewer's own buttons, never out to the page behind it.
      if (e.key === "Tab" && dialog.current) {
        const buttons = [...dialog.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
        if (buttons.length === 0) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, onStep]);

  const neighbours = images.length > 1 ? [images[(index + 1) % images.length], images[(index - 1 + images.length) % images.length]] : [];
  const control = "flex size-11 cursor-pointer items-center justify-center bg-black/50 text-white hover:bg-black/70";

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={`${name}, photo ${index + 1} of ${images.length}`}
      className="fixed inset-0 z-50 bg-black/90"
    >
      <button
        ref={closeButton}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        className={`${control} absolute top-3 right-3 z-10 md:top-5 md:right-5`}
      >
        <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M2 2l12 12M14 2L2 14" />
        </svg>
      </button>

      {images.length > 1 && (
        <>
          {(["previous", "next"] as const).map((direction) => (
            <button
              key={direction}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStep(direction === "next" ? 1 : -1);
              }}
              aria-label={direction === "next" ? "Next photo" : "Previous photo"}
              className={`${control} absolute top-1/2 z-10 -translate-y-1/2 ${direction === "next" ? "right-3 md:right-5" : "left-3 md:left-5"}`}
            >
              <svg aria-hidden viewBox="0 0 10 16" className={`h-5 w-3 ${direction === "next" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.5 1.5L2 8l6.5 6.5" />
              </svg>
            </button>
          ))}
          <p aria-hidden className="absolute top-3 left-3 z-10 bg-black/50 px-3 py-1 text-[13px] text-white md:top-5 md:left-5">
            {index + 1} / {images.length}
          </p>
        </>
      )}

      {/* key: a new photo starts its own loading picture, and its own zoom (the whole photo). */}
      <ZoomStage key={image.id} onClose={onClose}>
        <PlaceholderPicture
          poster={image.urls.detail}
          avif={image.urls.full.avif}
          webp={image.urls.full.webp}
          alt={name}
          loading="eager"
          placeholder={image.placeholder}
          className="size-full"
          imgClassName="size-full object-contain"
          blockClassName="inset-0"
          sweep={false}
        />
      </ZoomStage>

      <div hidden aria-hidden>
        {neighbours.map((other) => (
          <picture key={other.id}>
            <source srcSet={other.urls.full.avif} type="image/avif" />
            <img src={other.urls.full.webp} alt="" onLoad={() => markSeen(other.urls.full.webp)} />
          </picture>
        ))}
      </div>
    </div>
  );
}
