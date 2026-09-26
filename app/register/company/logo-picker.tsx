"use client";

import { useEffect, useMemo, useState } from "react";
import type { BusinessProfile } from "@/lib/business-profile";
import { logoDisplaySize } from "@/lib/logo";

// The logo is shown the way it will be on the site (navbar, cards), see lib/logo.ts: fitted inside 110 x 68, proportions
// kept, nothing cropped, never enlarged (files that are too small are refused, see logoSizeProblem).
// The box shrinks to the picture, so there is no white space around it. A wide logo is therefore short (4:1 = 110 x 27).
// These classes do the fitting when the size isn't known up front (a file just chosen, or an old saved logo); keep
// max-w / max-h in step with LOGO_MAX_WIDTH / LOGO_MAX_HEIGHT (27.5 and 17 are 110px and 68px).
// It is a block, not a flex item: a flex item shrinks to max-width but not to max-height, which would squash it.
const LOGO = "block h-auto max-h-17 w-auto max-w-27.5";

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
    content = <img src={previewUrl} alt="Chosen logo" onError={() => setBroken(previewUrl)} className={LOGO} />;
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
          className={LOGO}
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
      {problem && (
        <p role="alert" className="text-[13px] font-medium text-red-600">
          {problem}
        </p>
      )}
    </div>
  );
}
