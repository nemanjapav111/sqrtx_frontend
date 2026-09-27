"use client";

import { useId, useRef, useState } from "react";
import { FieldShell } from "@/app/components/field";

// One row of the list: a category to pick, or "create this new one" for what the user typed.
interface Row {
  text: string; // what to show
  value: string; // what is picked
  create?: boolean;
}

// A category box: clicking it opens the list right under the underline (like the address suggestions) and the user
// can type in the same box to narrow the list down. With `allowCreate` the user can also type a category that isn't
// in the list: a last row, `Create "what was typed"`, makes it the category (used for products, whose categories come
// from the products themselves). With `maxRows` only the first few matches are listed, so the list stays short.
export default function CategorySelect({
  value,
  invalid,
  onChange,
  options,
  label,
  placeholder,
  allowCreate = false,
  maxRows,
  smallPlaceholder = false,
  className,
}: {
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
  options: readonly string[]; // the categories to pick from
  label: string;
  placeholder: string;
  allowCreate?: boolean;
  maxRows?: number; // list at most this many categories (the Create row comes on top of that); all of them when not set
  smallPlaceholder?: boolean; // 14px placeholder text instead of the input's own 16px; both category boxes use this
  className?: string; // for example a maximum width
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null); // what the user is typing; null = show the picked category
  const [active, setActive] = useState(-1); // the highlighted row (arrow keys)
  const justFocused = useRef(false);

  // The categories that contain what the user typed (all of them for a blank box) and, when creating is allowed, a
  // last row that would create exactly what was typed (unless it is already there, in any letter case). With a row
  // limit, the categories that START with what was typed come first (that is usually what people mean); apart from
  // that the order is the one the categories came in (most used first, for products).
  function rowsFor(text: string): Row[] {
    const typed = text.trim();
    const needle = typed.toLowerCase();
    let matches = options.filter((c) => !needle || c.toLowerCase().includes(needle));
    if (maxRows !== undefined) {
      const starts = (c: string) => c.toLowerCase().startsWith(needle);
      matches = [...matches.filter(starts), ...matches.filter((c) => !starts(c))].slice(0, maxRows);
    }
    const rows: Row[] = matches.map((c) => ({ text: c, value: c }));
    const exists = options.some((c) => c.toLowerCase() === needle);
    if (allowCreate && typed && !exists) rows.push({ text: `Create "${typed}"`, value: typed, create: true });
    return rows;
  }
  const rows = rowsFor(query ?? "");

  function openList() {
    if (open) return;
    setActive(rowsFor("").findIndex((row) => row.value === value)); // start on the current pick, if it is listed
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
    setActive(text.trim() && rowsFor(text).length > 0 ? 0 : -1); // Enter picks the first row
  }

  function handleBlur() {
    const typed = (query ?? "").trim();
    // Typed a category and moved on without picking it: an existing one (whatever the letter case) counts as
    // picking it, and when creating is allowed a new one is created from the text.
    const existing = typed && options.find((c) => c.toLowerCase() === typed.toLowerCase());
    if (existing) onChange(existing);
    else if (allowCreate && typed) onChange(typed);
    close();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openList();
      if (rows.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a < 0 ? (step === 1 ? 0 : rows.length - 1) : (a + step + rows.length) % rows.length));
    } else if (e.key === "Enter" && open) {
      e.preventDefault(); // pick the highlighted row instead of submitting the form
      if (active >= 0 && rows[active]) choose(rows[active].value);
    }
  }

  return (
    <FieldShell
      id={id}
      label={label}
      invalid={invalid}
      className={className}
      dropdown={
        open && (
          // No design for this list yet.
          <ul id={listId} role="listbox" className="absolute top-full z-10 mt-1 w-full border border-black bg-white">
            {rows.length > 0 ? (
              rows.map((row, i) => (
                <li
                  key={`${row.create ? "create:" : ""}${row.value}`}
                  id={`${id}-option-${i}`}
                  role="option"
                  aria-selected={row.value === value}
                  // mouse down (not click) so the box keeps focus and doesn't close before the pick registers
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(row.value);
                  }}
                  // A category lights up (the same grey the field hints use, at low opacity so the black text
                  // stays readable) under the mouse or the arrow keys. The "Create ..." row has it all the time,
                  // so it stands apart from the categories, and goes a step darker when it is picked.
                  className={`cursor-pointer px-3 py-2 text-[14px] ${
                    row.create
                      ? i === active
                        ? "bg-[#4b5563]/20"
                        : "bg-[#4b5563]/10 hover:bg-[#4b5563]/20"
                      : i === active
                        ? "bg-[#4b5563]/10"
                        : "hover:bg-[#4b5563]/10"
                  } ${row.value === value ? "font-semibold" : ""}`}
                >
                  {row.text}
                </li>
              ))
            ) : (
              <li aria-hidden className="px-3 py-2 text-[14px] text-[#9ca3af]">
                {allowCreate ? "Type to create a category" : "No matching category"}
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
        placeholder={placeholder}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 && rows[active] ? `${id}-option-${active}` : undefined}
        aria-invalid={invalid}
        maxLength={255}
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
        className={`h-4.75 min-w-0 flex-1 cursor-pointer bg-transparent pr-6 outline-none placeholder:text-[#9ca3af] ${
          smallPlaceholder ? "placeholder:text-[14px]" : ""
        }`}
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
