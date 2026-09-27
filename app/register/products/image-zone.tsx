"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MAX_IMAGE_BYTES, MAX_PRODUCT_IMAGES, drawThumbnail, imageProblem, shrinkPhoto, type ProductImage } from "@/lib/products";

// A custom drag payload type, so a tile being dragged to reorder is never mistaken for an external file being
// dragged in (which carries the browser's own "Files" type) or for a plain text drag from elsewhere on the page.
const REORDER_MIME = "application/x-sqrtx-photo-id";

// One photo in the zone: its centre square, cropped to fill the tile like in the design. It is drawn from a sharp
// thumbnail of the photo (see drawThumbnail in lib/products.ts), not from the full-size file.
// Draggable to reorder (the first tile becomes the main photo); there is no design yet for this, or a
// keyboard/touch way to do it, so for now a mouse drag is the only way.
function Tile({
  image,
  big,
  dragging,
  dropTarget,
  onRemove,
  onDragStart,
  onDragEnd,
  onDragOverTile,
  onDropTile,
}: {
  image: ProductImage;
  big: boolean;
  dragging: boolean; // this tile is the one currently being dragged
  dropTarget: boolean; // another tile is being dragged over this one
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOverTile: (over: boolean) => void;
  onDropTile: (draggedId: string) => void;
}) {
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
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(REORDER_MIME, image.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        // Only claims a drag that is one of our own tiles; an external file drag passes through untouched, so
        // dropping a new photo directly onto an existing tile still adds it, the same as dropping anywhere else.
        if (!e.dataTransfer.types.includes(REORDER_MIME)) return;
        e.preventDefault();
        e.stopPropagation();
        onDragOverTile(true);
      }}
      onDragLeave={() => onDragOverTile(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes(REORDER_MIME)) return;
        e.preventDefault();
        e.stopPropagation();
        onDropTile(e.dataTransfer.getData(REORDER_MIME));
      }}
      // select-none: without it, a mouse-down-and-move on the tile can start the browser's own text selection
      // instead of (or as well as) the drag, which shows as a stray blue highlight while dragging.
      className={`relative shrink-0 cursor-grab active:cursor-grabbing select-none ${big ? "size-47.25" : "size-22.5"} ${
        dragging ? "opacity-40" : ""
      } ${dropTarget ? "outline outline-2 -outline-offset-2 outline-black" : ""}`}
    >
      {broken ? (
        <div className="flex size-full items-center justify-center bg-soft-grey-dark p-2.5 text-center text-[13px] font-medium">
          Photo added
        </div>
      ) : (
        <canvas ref={draw} role="img" aria-label={image.file.name} className="pointer-events-none size-full" />
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
// and a "+ Add Photo" tile. Photos can be added with the tile or dragged into the box. Dragging one photo onto another
// swaps their places (so dragging a photo into the first spot makes it the main one); there is no design for this
// yet. They are only uploaded when the product is added, together with the rest of the product.
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
  const [dragging, setDragging] = useState(false); // an external file is being dragged over the zone
  const [preparing, setPreparing] = useState(0); // how many batches of photos are being shrunk right now
  // Most photos shrink almost instantly, which would otherwise flash "Preparing..." on and straight back off again
  // (it reads as a glitch, not as a loading state). So this only turns on once preparing has been true for a
  // moment, which a fast add never reaches; a slow one (a real multi-second shrink) still shows it, just not instantly.
  const [showPreparing, setShowPreparing] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null); // a tile of ours being dragged, to reorder
  const [overId, setOverId] = useState<string | null>(null); // the tile it is currently over

  useEffect(() => {
    if (preparing === 0) return;
    const timer = setTimeout(() => setShowPreparing(true), 200);
    // Runs when this batch finishes (preparing changes again) or on unmount: cancels a timer that hasn't fired
    // yet, or turns the text back off once it has.
    return () => {
      clearTimeout(timer);
      setShowPreparing(false);
    };
  }, [preparing]);

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

  // Swaps the dragged photo with the one it was dropped on: each takes the other's place, and nothing else moves.
  // (Not "insert at the target's spot": that would shift every photo in between, so dragging photo 5 onto photo 1
  // would land it on 1 but push 1 down to where 2 used to be, not to where 5 came from. A plain swap is what a
  // drag onto another tile should look like: the two tiles trade places.)
  function reorder(draggedId: string, targetId: string) {
    setOverId(null);
    if (draggedId === targetId) return;
    onChange((current) => {
      const from = current.findIndex((x) => x.id === draggedId);
      const to = current.findIndex((x) => x.id === targetId);
      if (from === -1 || to === -1) return current; // a stale drag from before the list changed
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
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
          // Only external files turn the zone itself grey; a tile being dragged to reorder is handled by the
          // tiles (see Tile's onDragOver), and must not also trigger the "you're about to add files" look.
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault(); // without this the browser would open the dropped file instead
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragging(false);
          add([...e.dataTransfer.files]);
        }}
        // select-none for the same reason as the tile: dragging a tile across the "+ Add Photo" text (or any other
        // text in here) must not turn into a text selection along the way.
        className={`flex w-full flex-wrap content-end items-end gap-2.25 border border-dashed p-1 select-none ${
          invalid ? "border-red-600" : "border-black"
        } ${dragging ? "bg-soft-grey-dark" : "bg-soft-grey"}`}
      >
        {images.map((image, i) => (
          <Tile
            key={image.id}
            image={image}
            big={i === 0}
            dragging={draggingId === image.id}
            dropTarget={overId === image.id && draggingId !== null && draggingId !== image.id}
            onRemove={() => onChange((current) => current.filter((x) => x.id !== image.id))}
            onDragStart={() => setDraggingId(image.id)}
            onDragEnd={() => {
              setDraggingId(null);
              setOverId(null);
            }}
            onDragOverTile={(over) => setOverId(over ? image.id : null)}
            onDropTile={(draggedId) => reorder(draggedId, image.id)}
          />
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
      {/* No design for this text yet. min-h-4.5 reserves its line up front, the same way a field's hint/message
          row does (see FieldShell), so it turning on and off doesn't push the description field below. */}
      <div className="min-h-4.5">
        {showPreparing && (
          <p role="status" className="text-[13px] font-medium text-[#4b5563]">
            Preparing your photos. This can take a few seconds.
          </p>
        )}
      </div>
      {problem && (
        <p id={`${inputId}-problem`} role="alert" className="text-[13px] font-medium text-red-600">
          {problem}
        </p>
      )}
    </div>
  );
}
