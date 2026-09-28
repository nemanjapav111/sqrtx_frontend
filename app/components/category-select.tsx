"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import { FieldShell } from "@/app/components/field";

// A category to pick from. A plain string is its own name and value. An object keeps them apart: `value` is what is
// picked (the business categories use an id that never changes), `text` is what is shown, and `keywords` are never
// shown but make the search find the category (typing "barber" finds "Hair salon"). `group` is a heading: while the box
// is empty the list shows it above the first category of each group (the options come already in group order).
export interface CategoryOption {
  value: string;
  text: string;
  group?: string;
  keywords?: readonly string[]; // lowercase
}

const toOption = (option: string | CategoryOption): CategoryOption =>
  typeof option === "string" ? { value: option, text: option } : option;

// One row of the list: a category to pick, or "create this new one" for what the user typed.
interface Row {
  text: string; // what to show
  value: string; // what is picked
  group?: string;
  create?: boolean;
  fallback?: boolean; // the "can't find yours" row
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
  fallback,
  className,
}: {
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
  options: readonly (string | CategoryOption)[]; // the categories to pick from
  label: string;
  placeholder: string;
  allowCreate?: boolean;
  maxRows?: number; // list at most this many categories (the Create row comes on top of that); all of them when not set
  smallPlaceholder?: boolean; // 14px placeholder text instead of the input's own 16px; both category boxes use this
  // A last row, stuck to the bottom edge of the list while it scrolls, shown once the user has typed something: for a
  // business whose category isn't in the list (`text` is the sentence on the row, `value` the category it picks).
  fallback?: { value: string; text: string };
  className?: string; // for example a maximum width
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null); // what the user is typing; null = show the picked category
  const [active, setActive] = useState(-1); // the highlighted row (arrow keys)
  const justFocused = useRef(false);

  // Arrow keys can move the highlight below the visible part of a long list (the business categories): keep it in view.
  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, id]);

  const list = options.map(toOption);
  const pickedText = list.find((o) => o.value === value)?.text ?? value; // an unknown value is shown as it is

  // The categories that match what the user typed (all of them for a blank box) and, when creating is allowed, a
  // last row that would create exactly what was typed (unless it is already there, in any letter case). A category
  // matches by its name or by a keyword. Best first (a "whole word" is one that ends where the typed text ends, so "car"
  // is a whole word in "Car dealer" but only the start of "Carpentry"):
  //   1. the name STARTS with the typed text as whole words ("Car dealer"), that is usually what people mean
  //   2. the name starts with it, in the middle of a word ("Carpentry")
  //   3. a later word of the name is that whole word ("shop" finds "Barber shop")
  //   4. a later word of the name starts with it
  //   5. a keyword has it as a whole word ("barber" finds "Hair salon")
  //   6. a keyword word starts with it
  //   7. the name only contains it in the middle of a word ("ery" finds "Bakery")
  // Keywords are matched by word starts only, so "car" does not find "skincare". Inside each of these the order is the
  // one the categories came in (most used first, for products). Categories that have a group are then gathered under
  // their group heading: the group holding the best match comes first, and inside a group the best match is first.
  // With a row limit only the first few are listed.
  function rowsFor(text: string): Row[] {
    const typed = text.trim();
    const needle = typed.toLowerCase();
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // so what was typed can't act as a pattern
    const startsWhole = new RegExp(`^${escaped}(?![\\p{L}\\p{N}])`, "u");
    const hasWholeWord = new RegExp(`(?:^|\\s)${escaped}(?![\\p{L}\\p{N}])`, "u");
    const hasWordStart = (text: string) => ` ${text}`.includes(` ${needle}`); // a word (or the words) of text begin with the needle
    const tierOf = (o: CategoryOption) => {
      const name = o.text.toLowerCase();
      if (startsWhole.test(name)) return 0;
      if (name.startsWith(needle)) return 1;
      if (hasWholeWord.test(name)) return 2;
      if (hasWordStart(name)) return 3;
      if (o.keywords?.some((k) => hasWholeWord.test(k))) return 4;
      if (o.keywords?.some(hasWordStart)) return 5;
      return name.includes(needle) ? 6 : null; // null: no match
    };
    let matches = list;
    if (needle) {
      const tiers = new Map(list.map((o) => [o, tierOf(o)] as const));
      matches = [0, 1, 2, 3, 4, 5, 6].flatMap((tier) => list.filter((o) => tiers.get(o) === tier));
    }
    if (needle && matches.some((o) => o.group)) {
      const groups = [...new Set(matches.map((o) => o.group))]; // in the order of their best match
      matches = groups.flatMap((group) => matches.filter((o) => o.group === group));
    }
    if (maxRows !== undefined) matches = matches.slice(0, maxRows);
    const rows: Row[] = matches.map((o) => ({ text: o.text, value: o.value, group: o.group }));
    const exists = list.some((o) => o.text.toLowerCase() === needle);
    if (allowCreate && typed && !exists) rows.push({ text: `Create "${typed}"`, value: typed, create: true });
    if (fallback && typed && !rows.some((row) => row.value === fallback.value)) {
      rows.push({ text: fallback.text, value: fallback.value, fallback: true });
    }
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
    // On a phone the first match is pre-selected (highlighted; never the "can't find yours" row). With a mouse nothing
    // is pre-selected: the user points at a row, or uses the arrow keys and Enter.
    const hasMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    setActive(!hasMouse && text.trim() && rowsFor(text).some((row) => !row.fallback) ? 0 : -1);
  }

  function handleBlur() {
    const typed = (query ?? "").trim();
    // Typed a category and moved on without picking it: an existing one (whatever the letter case) counts as
    // picking it, and when creating is allowed a new one is created from the text.
    const existing = typed ? list.find((o) => o.text.toLowerCase() === typed.toLowerCase()) : undefined;
    if (existing) onChange(existing.value);
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
          <ul id={listId} role="listbox" className="absolute top-full z-10 mt-1 max-h-64 w-full overflow-y-auto overscroll-contain border border-black bg-white">
            {!rows.some((row) => !row.fallback) && (
              <li aria-hidden className="px-3 py-2 text-[14px] text-[#9ca3af]">
                {allowCreate ? "Type to create a category" : "No matching category"}
              </li>
            )}
            {rows.map((row, i) => (
              <Fragment key={`${row.create ? "create:" : ""}${row.fallback ? "fallback:" : ""}${row.value}`}>
                {row.group && row.group !== rows[i - 1]?.group && (
                  // No design for the headings yet.
                  // A solid mid grey, clearly darker than the row highlight (which is a very light grey), so a heading
                  // is never mistaken for a highlighted row.
                  <li role="presentation" className="bg-[#d1d5db] px-3 py-1.5 text-[12px] font-semibold tracking-wide text-[#1f2937] uppercase">
                    {row.group}
                  </li>
                )}
                <li
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
                  // The "can't find yours" row is solid (not see-through) because list rows scroll underneath it.
                  className={`cursor-pointer px-3 py-2 text-[14px] ${
                    row.fallback
                      ? `sticky bottom-0 border-t border-black ${i === active ? "bg-[#ededee]" : "bg-white hover:bg-[#ededee]"}`
                      : row.create
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
              </Fragment>
            ))}
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
        value={query ?? pickedText}
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
