"use client";

import { useEffect, useRef, useState } from "react";

// The products page's category filter (product-list.tsx): a chevron and a label ("All" or the picked category) that
// open a small popup listing every category. Same white-box, 1px #b8b8b8 border, sharp-corners look as the account
// menu (visitor-icon.tsx), but plain — no pointer. That menu's trigger is a small icon in a busy header, so a pointer
// earns its keep there disambiguating what it belongs to; this trigger is a wide labeled row that the popup sits
// flush against, so the connection is already obvious without one.

const WIDTH_CLASS = "w-45"; // 180px
const GAP = 4; // between the trigger row and the panel

export interface CategoryFilterOption {
  value: string;
  text: string;
}

export default function CategoryFilter({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly CategoryFilterOption[]; // "All" first, then the available categories
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Closes on a click outside the row/panel, or on Escape (same as the account menu).
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const picked = options.find((o) => o.value === value)?.text ?? value;

  return (
    <div ref={rootRef} className="relative mb-8.5 flex h-12 w-fit items-center">
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
          style={{ top: `calc(100% + ${GAP}px)` }}
          className={`absolute left-0 z-10 flex max-h-64 flex-col overflow-y-auto overscroll-contain border border-[#b8b8b8] bg-white ${WIDTH_CLASS}`}
        >
          {options.map((o, i) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex h-10 w-full cursor-pointer items-center px-4.25 text-left text-[14px] hover:bg-[#4b5563]/10 ${
                i === 0 ? "" : "border-t border-[#b8b8b8]"
              } ${o.value === value ? "font-semibold" : ""}`}
            >
              {o.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
