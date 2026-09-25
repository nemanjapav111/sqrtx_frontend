"use client";

import { useEffect, useMemo, useState } from "react";
import type { BusinessProfile } from "@/lib/business-profile";

// The company logo box from the design: click it to choose a photo. It shows the new photo, or the saved logo when
// editing, or "+ Add photo".
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
  if (previewUrl && broken !== previewUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- a local preview, not a site image
    content = <img src={previewUrl} alt="Chosen logo" onError={() => setBroken(previewUrl)} className="max-h-full max-w-full object-contain" />;
  } else if (file) {
    content = "Photo chosen";
  } else if (saved) {
    // <picture>, not next/image: the API's files are already optimized (see API.md).
    content = (
      <picture>
        <source srcSet={saved.avif} type="image/avif" />
        <source srcSet={saved.webp} type="image/webp" />
        <img src={saved.webp} alt="Your company logo" className="max-h-full max-w-full object-contain" />
      </picture>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2.25">
      <span className="text-[14px] font-semibold">Company logo*</span>
      <label
        className={`flex h-17 w-27.5 cursor-pointer items-center justify-center overflow-hidden border p-2.5 text-[13px] font-medium focus-within:shadow-[0_0_0_1px_black] ${
          invalid ? "border-red-600" : "border-black"
        }`}
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
