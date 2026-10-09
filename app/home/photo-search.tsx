"use client";

import { useRef } from "react";
import { useHome } from "./home-context";

// Search by photo, the visitor's side (the camera button and the small "Photo" chip of the search box, owner's design 2026-10-08). The button opens
// the phone's camera or gallery (or a computer's file picker), the picture picked becomes a chip with its preview and an x in the box, it is uploaded at
// once (home-context.tsx) and the lists show the products or services whose photo is nearest (the API's search by photo). Words typed with a photo are not
// used by the API, so the box has no place to type while a photo is picked: the camera button picks another one, the x removes it.
const MAX_BYTES = 15 * 1024 * 1024; // a phone's photo; the browser will shrink it before it is sent, once there is somewhere to send it

/**
 * What a list says INSTEAD of its items while the photo cannot be searched by: it is being read (uploading), it could not be (failed), or the page is the
 * Companies' (a business has no photo to compare with). Not shown once the photo is ready on a products or services page: the list shows the answer.
 */
export default function PhotoSearchNotice({ companies = false }: { companies?: boolean }) {
  const { photo, clearPhoto } = useHome();
  const words = companies
    ? "Companies can't be searched by photo. Remove the photo to see the companies, or look in Products and Services."
    : photo?.state === "failed"
      ? photo.problem
      : "Looking at your photo…";
  return (
    <main className="mx-auto flex w-full max-w-97.5 flex-col items-start gap-4 px-4 pt-10 md:px-5">
      <p role={photo?.state === "failed" ? "alert" : "status"} className="text-[16px] leading-6 text-[#1f2937]">
        {words}
      </p>
      {(companies || photo?.state === "failed") && (
        <button type="button" onClick={clearPhoto} className="cursor-pointer border-b-[1.5px] border-black pb-1 text-[16px] leading-[1.21] font-bold">
          Remove photo
        </button>
      )}
    </main>
  );
}

const CAMERA = (
  <>
    <path d="M4 8h3l1.6-2.4h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13" r="3.6" />
  </>
);

/** The camera button at the end of the search box: picks a picture. `className` colours it (it is black on the white box). */
export function CameraButton({ className = "" }: { className?: string }) {
  const { choosePhoto } = useHome();
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        aria-label="Search by photo"
        onClick={() => input.current?.click()}
        className={`flex size-8 shrink-0 cursor-pointer items-center justify-center ${className}`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {CAMERA}
        </svg>
      </button>
      {/* No `capture`: a phone then offers the camera and the gallery, a computer its files. */}
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // the same picture can be picked again after it was removed
          if (file && file.type.startsWith("image/") && file.size <= MAX_BYTES) choosePhoto(file);
        }}
      />
    </>
  );
}

/** The chip in the search box that stands for the picked photo: its preview, the word "Photo" and an x that removes it. */
export function PhotoChip() {
  const { photo, clearPhoto } = useHome();
  if (!photo) return null;
  return (
    <span className="flex h-8 shrink-0 items-center gap-2 bg-[#f3f4f6] pr-2 text-[14px] leading-none font-medium text-black">
      {/* eslint-disable-next-line @next/next/no-img-element -- the browser's own address of the picked file: nothing to optimise */}
      <img src={photo.url} alt="" className="size-8 object-cover" />
      Photo
      <button type="button" onClick={clearPhoto} aria-label="Remove photo" className="flex size-5 cursor-pointer items-center justify-center">
        <svg aria-hidden viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </span>
  );
}
