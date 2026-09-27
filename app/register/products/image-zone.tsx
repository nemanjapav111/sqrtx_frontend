"use client";

import { useCallback, useId, useRef, useState } from "react";
import { MAX_IMAGE_BYTES, MAX_PRODUCT_IMAGES, drawThumbnail, imageProblem, shrinkPhoto, type ProductImage } from "@/lib/products";

// One photo in the zone: its centre square, cropped to fill the tile like in the design. It is drawn from a sharp
// thumbnail of the photo (see drawThumbnail in lib/products.ts), not from the full-size file.
function Tile({ image, big, onRemove }: { image: ProductImage; big: boolean; onRemove: () => void }) {
  // Most browsers can't draw a HEIC photo. When a preview fails we just say a photo was added.
  const [broken, setBroken] = useState(false);
  // Draws when the canvas appears. It has to be a stable function, or React would draw again on every render.
  const draw = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      let leftAlready = false;
      drawThumbnail(image.file, canvas).catch(() => {
        if (!leftAlready) setBroken(true);
      });
      return () => {
        leftAlready = true;
      };
    },
    [image.file],
  );

  return (
    <div className={`relative shrink-0 ${big ? "size-47.25" : "size-22.5"}`}>
      {broken ? (
        <div className="flex size-full items-center justify-center bg-soft-grey-dark p-2.5 text-center text-[13px] font-medium">
          Photo added
        </div>
      ) : (
        <canvas ref={draw} role="img" aria-label={image.file.name} className="size-full" />
      )}
      {/* No design for removing a photo yet: a small white-on-black cross in the corner. */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${image.file.name}`}
        className="absolute top-0 right-0 flex size-6 cursor-pointer items-center justify-center bg-black text-white"
      >
        <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" />
        </svg>
      </button>
    </div>
  );
}

// The "Images*" zone from the design: a dashed box holding the chosen photos (the first one big, it is the main photo)
// and a "+ Add Photo" tile. Photos can be added with the tile or dragged into the box. They are only uploaded when
// the product is added, together with the rest of the product.
export default function ImageZone({
  images,
  invalid,
  onChange,
}: {
  images: ProductImage[];
  invalid: boolean;
  // Gets a function from the current list to the new one, so two quick additions can't both start from an old list.
  onChange: (update: (current: ProductImage[]) => ProductImage[]) => void;
}) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false); // a file is being dragged over the zone
  const [preparing, setPreparing] = useState(0); // how many batches of photos are being shrunk right now

  // Adds what can be used and says what couldn't, in one sentence. Every photo is shrunk first (a phone photo can be 20 MB
  // or more), one at a time so that only one big photo is decoded in memory at once; the tile appears when it is ready.
  async function add(files: File[]) {
    if (files.length === 0) return;
    const problems: string[] = [];
    const usable: File[] = [];
    for (const file of files) {
      const why = imageProblem(file);
      if (why) problems.push(why);
      else usable.push(file);
    }
    if (images.length + usable.length > MAX_PRODUCT_IMAGES) problems.push(`A product can have up to ${MAX_PRODUCT_IMAGES} photos.`);
    setProblem(problems.length > 0 ? problems.join(" ") : null);
    if (usable.length === 0) return;

    setPreparing((n) => n + 1);
    const ready: ProductImage[] = [];
    try {
      for (const file of usable) {
        const shrunk = await shrinkPhoto(file);
        if (shrunk.size > MAX_IMAGE_BYTES) {
          // Either the browser couldn't shrink it (HEIC), or even the shrunk photo is too big.
          problems.push(
            shrunk === file
              ? `"${file.name}" is larger than 10 MB and this browser can't shrink it. Choose a JPEG or PNG version of the photo.`
              : `"${file.name}" is still larger than 10 MB after shrinking.`,
          );
          continue;
        }
        ready.push({ id: crypto.randomUUID(), file: shrunk });
      }
    } finally {
      setPreparing((n) => n - 1);
    }
    setProblem(problems.length > 0 ? problems.join(" ") : null);
    if (ready.length > 0) onChange((current) => [...current, ...ready].slice(0, MAX_PRODUCT_IMAGES));
  }

  function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    add([...(e.target.files ?? [])]);
    e.target.value = ""; // so choosing the same file again still counts
  }

  const empty = images.length === 0;
  const full = images.length >= MAX_PRODUCT_IMAGES;
  // Figma measures padding from the outside edge, so the 1px border is part of the design's 10px padding on the small tile
  // (a 70px wide text area) and of the 5px around the tiles.
  const tileClass = "flex shrink-0 cursor-pointer items-center justify-center border border-black bg-white text-center text-[13px] font-medium";

  return (
    <div className="flex w-full flex-col gap-2.25">
      <span className="text-[14px] font-semibold">Images*</span>
      <div
        onDragOver={(e) => {
          e.preventDefault(); // without this the browser would open the dropped file instead
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add([...e.dataTransfer.files]);
        }}
        className={`flex w-full flex-wrap content-end items-end gap-2.25 border border-dashed p-1 ${
          invalid ? "border-red-600" : "border-black"
        } ${dragging ? "bg-soft-grey-dark" : "bg-soft-grey"}`}
      >
        {images.map((image, i) => (
          <Tile key={image.id} image={image} big={i === 0} onRemove={() => onChange((current) => current.filter((x) => x.id !== image.id))} />
        ))}
        {!full && (
          <button
            type="button"
            name="images"
            aria-describedby={problem ? `${inputId}-problem` : undefined}
            onClick={() => input.current?.click()}
            className={`${tileClass} ${empty ? "size-47.25 p-2.5" : "size-22.5 p-2.25"} focus-visible:shadow-[0_0_0_1px_black] focus-visible:outline-none`}
          >
            {empty ? (
              // "or" sits between blank lines, as in the design.
              <span className="whitespace-pre-line">{"+ Add Photo\n\nor\n\nDrag and drop photos here"}</span>
            ) : (
              "+ Add Photo"
            )}
          </button>
        )}
        <input
          ref={input}
          type="file"
          multiple
          tabIndex={-1}
          aria-label="Product photos"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          className="sr-only"
          onChange={pickFiles}
        />
      </div>
      {/* No design for this text yet. */}
      {preparing > 0 && (
        <p role="status" className="text-[13px] font-medium text-[#4b5563]">
          Preparing your photos. This can take a few seconds.
        </p>
      )}
      {problem && (
        <p id={`${inputId}-problem`} role="alert" className="text-[13px] font-medium text-red-600">
          {problem}
        </p>
      )}
    </div>
  );
}
