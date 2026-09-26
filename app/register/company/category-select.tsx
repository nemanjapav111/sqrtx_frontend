"use client";

import { useId, useRef, useState } from "react";
import { FieldShell } from "@/app/components/field";
import { BUSINESS_CATEGORIES } from "@/lib/business-profile";

// The categories that contain what the user typed (all of them for a blank box).
function filterCategories(text: string) {
  const needle = text.trim().toLowerCase();
  return needle ? BUSINESS_CATEGORIES.filter((c) => c.toLowerCase().includes(needle)) : BUSINESS_CATEGORIES;
}

// The business category box. Clicking it opens the list right under the underline (like the address
// suggestions) and the user can type in the same box to narrow the list down.
export default function CategorySelect({
  value,
  invalid,
  onChange,
}: {
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null); // what the user is typing; null = show the picked category
  const [active, setActive] = useState(-1); // the highlighted row (arrow keys)
  const justFocused = useRef(false);

  const matches = filterCategories(query ?? "");

  function openList() {
    if (open) return;
    setActive(BUSINESS_CATEGORIES.indexOf(value)); // start on the current pick, if there is one
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setQuery(null); // whatever was typed but not picked is dropped
  }

  function choose(category: string) {
    onChange(category);
    close();
  }

  function handleChange(text: string) {
    setQuery(text);
    setOpen(true);
    setActive(text.trim() && filterCategories(text).length > 0 ? 0 : -1); // Enter picks the first match
  }

  function handleBlur() {
    // Typed a category's full name and moved on without picking it: count that as picking it.
    const typed = (query ?? "").trim().toLowerCase();
    const exact = typed && BUSINESS_CATEGORIES.find((c) => c.toLowerCase() === typed);
    if (exact) onChange(exact);
    close();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openList();
      if (matches.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a < 0 ? (step === 1 ? 0 : matches.length - 1) : (a + step + matches.length) % matches.length));
    } else if (e.key === "Enter" && open) {
      e.preventDefault(); // pick the highlighted row instead of submitting the form
      if (active >= 0 && matches[active]) choose(matches[active]);
    }
  }

  return (
    <FieldShell
      id={id}
      label="Business category*"
      invalid={invalid}
      className="max-w-62.5"
      dropdown={
        open && (
          // No design for this list yet.
          <ul id={listId} role="listbox" className="absolute top-full z-10 mt-1 w-full border border-black bg-white">
            {matches.length > 0 ? (
              matches.map((category, i) => (
                <li
                  key={category}
                  id={`${id}-option-${i}`}
                  role="option"
                  aria-selected={category === value}
                  // mouse down (not click) so the box keeps focus and doesn't close before the pick registers
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(category);
                  }}
                  className={`cursor-pointer px-3 py-2 text-[14px] hover:bg-[#f3f4f6] ${i === active ? "bg-[#f3f4f6]" : ""} ${category === value ? "font-semibold" : ""}`}
                >
                  {category}
                </li>
              ))
            ) : (
              <li aria-hidden className="px-3 py-2 text-[14px] text-[#9ca3af]">
                No matching category
              </li>
            )}
          </ul>
        )
      }
    >
      <input
        id={id}
        name="category"
        type="text"
        role="combobox"
        autoComplete="off"
        placeholder="Select business category"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 && matches[active] ? `${id}-option-${active}` : undefined}
        aria-invalid={invalid}
        value={query ?? value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={(e) => {
          justFocused.current = true;
          e.target.select(); // so typing replaces the picked category instead of adding to it
          openList();
        }}
        // A click on the box opens the list too (also after Escape, when the box still has focus).
        onClick={openList}
        // Keep the select-all from focusing: some browsers drop the selection when the mouse button is released.
        onMouseUp={(e) => {
          if (justFocused.current) e.preventDefault();
          justFocused.current = false;
        }}
        onBlur={handleBlur}
        className="h-4.75 min-w-0 flex-1 cursor-pointer bg-transparent pr-6 outline-none placeholder:text-[14px] placeholder:text-[#9ca3af]"
      />
      {/* Laid on top of the box, purely decorative, so it never steals the click. */}
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute top-1/2 right-0 size-4.75 -translate-y-1/2"
        fill="none"
        stroke="black"
        strokeWidth="2"
      >
        <path d="M5 8l5 5 5-5" />
      </svg>
    </FieldShell>
  );
}
