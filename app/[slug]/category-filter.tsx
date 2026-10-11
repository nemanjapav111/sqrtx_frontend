"use client";

import { useRef, useState } from "react";
import { POPUP_GAP, POPUP_PANEL, POPUP_ROW, TICK } from "@/app/components/popup";
import { usePopupDismiss } from "@/app/components/use-popup-dismiss";

// The products page's category filter (product-list.tsx): a chevron and a label ("All" or the picked category) that
// open a small popup listing every category, in the look of every popup of the site (components/popup.tsx: the location
// picker's card, rows without lines, a tick on the chosen one; since 2026-10-09). No pointer: this trigger is a wide labeled row
// that the popup sits flush against, so the connection is already obvious without one.

const WIDTH_CLASS = "w-60"; // 240px

export interface CategoryFilterOption {
  value: string;
  text: string;
}

export default function CategoryFilter({
  value,
  options,
  onChange,
  spacing = "mb-8.5",
}: {
  value: string;
  options: readonly CategoryFilterOption[]; // "All" first, then the available categories
  onChange: (value: string) => void;
  spacing?: string; // the space below it (classes); the products' list uses the default, the services' rows have their own
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Closes on a click outside it (that click does nothing else), or on Escape: components/use-popup-dismiss.ts.
  usePopupDismiss(open, rootRef, () => setOpen(false));

  const picked = options.find((o) => o.value === value)?.text ?? value;

  return (
    <div ref={rootRef} className={`relative ${spacing} flex h-12 w-fit items-center`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-full cursor-pointer items-center gap-2 py-2.25 pr-2"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="#1e1e1e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
        <span className="text-[12px] leading-[1.2] font-bold">{picked}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Category"
          // POPUP_GAP under the bottom of the chevron: the row is 48px with the chevron (20px) in the middle, so 10px under the middle + the gap
          style={{ top: `calc(50% + 10px + ${POPUP_GAP}px)` }}
          className={`absolute left-0 z-10 flex max-h-[min(20rem,60dvh)] max-w-[calc(100vw-1rem)] flex-col overflow-y-auto overscroll-contain ${POPUP_PANEL} ${WIDTH_CLASS}`}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`${POPUP_ROW} ${o.value === value ? "font-semibold" : ""}`}
            >
              <span className="min-w-0 truncate">{o.text}</span>
              {o.value === value && TICK}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
