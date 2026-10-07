"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BusinessProfile } from "@/lib/business-profile";
import { LOGO_ROW_FIT_CLASS, LOGO_ROW_MAX_HEIGHT, LOGO_ROW_MAX_WIDTH, logoDisplaySize } from "@/lib/logo";

// The logo is shown the way it will be on the site (the top bar, the company blocks), see lib/logo.ts: fitted inside 100 x 58, proportions
// kept, nothing cropped, never enlarged (files that are too small are refused, see logoSizeProblem).
// The box shrinks to the picture, so there is no white space around it. A wide logo is therefore short (4:1 = 100 x 25).

// The company logo box from the design: click it to choose a photo. It shows the new photo, or the saved logo when
// editing, or "+ Add photo". With a logo the box shrinks to fit it instead of keeping the empty box's 100 x 58 (the size the logo is shown at on the site, at most).
export default function LogoPicker({
  file,
  saved,
  invalid,
  problem,
  onPick,
}: {
  file: File | null; // a newly chosen photo
  saved: BusinessProfile["logo"]; // the logo already saved on the server (editing), if any
  invalid: boolean;
  problem: string | null; // why the chosen file can't be used
  onPick: (file: File | null) => void;
}) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  // Most browsers can't draw a HEIC photo. When a preview fails we just say a photo was chosen.
  const [broken, setBroken] = useState<string | null>(null);
  // The chosen photo that has finished loading, and is the one ON SCREEN. A big photo is shrunk in the browser a moment after it is picked and the
  // shrunk file replaces it (a new file, so a new address): the box keeps showing the picture that is on screen while the new one loads out of
  // sight, and swaps when it is ready. (It used to fall back to "+ Add photo" in between: a flash of the empty box, 6px shorter or taller, that
  // moved the Save button under it up and down.) Until a first one has loaded the box keeps the size it had (an <img> that hasn't loaded is 0 x 0,
  // which collapsed the box to a thin line for a moment).
  // With its pixel size: the picture is drawn at an exact size worked out from it (see below), not left to the browser to shrink.
  const [loaded, setLoaded] = useState<{ url: string; width: number; height: number } | null>(null);
  const loadedUrl = loaded?.url ?? null;
  // No new photo (the dialog was cancelled, the box was cleared): forget the one that was on screen (adjusting state while rendering, as React documents).
  if (!previewUrl && loaded !== null) setLoaded(null);
  // Every address made here is let go of once it is neither the newest nor the one on screen (and all of them when the picker goes).
  const made = useRef(new Set<string>());
  useEffect(() => {
    if (previewUrl) made.current.add(previewUrl);
    for (const url of made.current) {
      if (url !== previewUrl && url !== loadedUrl) {
        URL.revokeObjectURL(url);
        made.current.delete(url);
      }
    }
  }, [previewUrl, loadedUrl]);
  useEffect(() => {
    const all = made.current;
    return () => all.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  const shownUrl = previewUrl && loadedUrl ? loadedUrl : null; // the picture on screen
  const previewPending = !!previewUrl && broken !== previewUrl && loadedUrl !== previewUrl; // the newest one is still loading

  // The logo already saved on the server (editing), drawn the way it is shown on the site.
  // <picture>, not next/image: the API's files are already optimized (see API.md).
  // The API sends the picture's pixel size, so its space is reserved before it loads and the form doesn't jump.
  const savedPicture = saved && (
    <picture className="contents">
      <source srcSet={saved.avif} type="image/avif" />
      <source srcSet={saved.webp} type="image/webp" />
      <img
        src={saved.webp}
        alt="Your company logo"
        width={saved.width ?? undefined}
        height={saved.height ?? undefined}
        style={logoDisplaySize(saved.width, saved.height, LOGO_ROW_MAX_WIDTH, LOGO_ROW_MAX_HEIGHT) ?? undefined}
        className={LOGO_ROW_FIT_CLASS}
      />
    </picture>
  );

  let content: React.ReactNode = "+ Add photo";
  let showsLogo = false; // a real picture is in the box (not one of the texts)
  if (previewUrl && broken !== previewUrl) {
    // While the chosen photo is still loading the box stays as it is: the picture that is on screen, else the saved logo when editing (in its
    // own, maybe much smaller, box: swapping in the empty "+ Add photo" box for a moment showed a bigger frame), else "+ Add photo".
    showsLogo = shownUrl ? true : previewPending ? !!saved : true;
    content = (
      <>
        {!shownUrl && previewPending && (savedPicture ?? "+ Add photo")}
        {shownUrl && loaded && (
          // The size is worked out here (fitted inside 100 x 58, never enlarged) and set on the <img>, so the box around it is exactly the picture's:
          // left to the browser (max-width and max-height on an auto-sized picture inside a box that shrinks to fit), some browsers (Safari)
          // made the box as wide as the width limit allows and left white space to the right of a picture that the height limit made narrower.
          // eslint-disable-next-line @next/next/no-img-element -- a local preview, not a site image
          <img
            src={shownUrl}
            alt="Chosen logo"
            width={loaded.width}
            height={loaded.height}
            style={logoDisplaySize(loaded.width, loaded.height, LOGO_ROW_MAX_WIDTH, LOGO_ROW_MAX_HEIGHT) ?? undefined}
            className={LOGO_ROW_FIT_CLASS}
          />
        )}
        {/* The newest photo loads out of sight (hidden, but it still loads) and takes the place of the one on screen when it is ready. */}
        {(previewPending || !shownUrl) && (
          // eslint-disable-next-line @next/next/no-img-element -- a local preview, not a site image
          <img
            src={previewUrl}
            alt=""
            onLoad={(e) => setLoaded({ url: previewUrl, width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
            onError={() => setBroken(previewUrl)}
            className="hidden"
          />
        )}
      </>
    );
  } else if (file) {
    content = "Photo chosen";
  } else if (saved) {
    showsLogo = true;
    content = savedPicture;
  }

  return (
    <div className="flex w-full flex-col gap-2.25">
      <span className="text-[14px] font-semibold">Company logo*</span>
      {/* The space of the biggest box is always reserved (a logo 58px tall and its 1px borders: 60px), so the box growing, shrinking or
          swapping between "+ Add photo", the new logo and the saved one never moves what is under it, the Save button included. */}
      <div className="flex h-[60px] items-start">
        <label
          className={`max-w-full cursor-pointer overflow-hidden border text-[13px] font-medium focus-within:shadow-[0_0_0_1px_black] ${
            showsLogo ? "block w-fit" : "flex h-[58px] w-[100px] items-center justify-center"
          } ${invalid ? "border-red-600" : "border-black"}`}
        >
          <input
            type="file"
            name="logo"
            aria-label="Company logo"
            aria-invalid={invalid}
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            className="sr-only"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
          {content}
        </label>
      </div>
      {/* Not cropped, only fitted (see the comment on LOGO): a logo shaped close to this box keeps the most of its size.
          Pixels, not a ratio: easier to act on when picking or exporting a file. Not in the design; wording is a placeholder.
          When the chosen file has a problem its message takes the place of this line (not added under it), so the page does not move. */}
      {problem ? (
        <p role="alert" className="text-[13px] font-medium text-red-600">
          {problem}
        </p>
      ) : (
        <p className="text-[13px] font-medium text-[#4b5563]">Ideal logo size: 220 x 136 px.</p>
      )}
    </div>
  );
}
