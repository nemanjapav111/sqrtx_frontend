"use client";

import { useEffect, useMemo, useState } from "react";
import type { BusinessProfile } from "@/lib/business-profile";
import { LOGO_FIT_CLASS, logoDisplaySize } from "@/lib/logo";

// The logo is shown the way it will be on the site (navbar, cards), see lib/logo.ts: fitted inside 110 x 68, proportions
// kept, nothing cropped, never enlarged (files that are too small are refused, see logoSizeProblem).
// The box shrinks to the picture, so there is no white space around it. A wide logo is therefore short (4:1 = 110 x 27).

// The company logo box from the design: click it to choose a photo. It shows the new photo, or the saved logo when
// editing, or "+ Add photo". With a logo the box shrinks to fit it instead of keeping the design's 110 x 68.
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
  useEffect(() => () => (previewUrl ? URL.revokeObjectURL(previewUrl) : undefined), [previewUrl]);
  // Most browsers can't draw a HEIC photo. When a preview fails we just say a photo was chosen.
  const [broken, setBroken] = useState<string | null>(null);

  let content: React.ReactNode = "+ Add photo";
  let showsLogo = false; // a real picture is in the box (not one of the texts)
  if (previewUrl && broken !== previewUrl) {
    showsLogo = true;
    // eslint-disable-next-line @next/next/no-img-element -- a local preview, not a site image
    content = <img src={previewUrl} alt="Chosen logo" onError={() => setBroken(previewUrl)} className={LOGO_FIT_CLASS} />;
  } else if (file) {
    content = "Photo chosen";
  } else if (saved) {
    showsLogo = true;
    // <picture>, not next/image: the API's files are already optimized (see API.md).
    // The API sends the picture's pixel size, so its space is reserved before it loads and the form doesn't jump.
    content = (
      <picture className="contents">
        <source srcSet={saved.avif} type="image/avif" />
        <source srcSet={saved.webp} type="image/webp" />
        <img
          src={saved.webp}
          alt="Your company logo"
          width={saved.width ?? undefined}
          height={saved.height ?? undefined}
          style={logoDisplaySize(saved.width, saved.height) ?? undefined}
          className={LOGO_FIT_CLASS}
        />
      </picture>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2.25">
      <span className="text-[14px] font-semibold">Company logo*</span>
      <label
        className={`max-w-full cursor-pointer overflow-hidden border text-[13px] font-medium focus-within:shadow-[0_0_0_1px_black] ${
          showsLogo ? "block w-fit" : "flex h-17 w-27.5 items-center justify-center"
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
      {/* Not cropped, only fitted (see the comment on LOGO): a logo shaped close to this box keeps the most of its size.
          Pixels, not a ratio: easier to act on when picking or exporting a file. Not in the design; wording is a placeholder. */}
      <p className="text-[13px] font-medium text-[#4b5563]">Ideal logo size: 220 x 136 px.</p>
      {problem && (
        <p role="alert" className="text-[13px] font-medium text-red-600">
          {problem}
        </p>
      )}
    </div>
  );
}
