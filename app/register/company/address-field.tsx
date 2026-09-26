"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FieldShell } from "@/app/components/field";
import {
  getPlaceDetails,
  newSessionToken,
  searchAddresses,
  type AddressSuggestion,
  type PlaceDetails,
  type SessionToken,
} from "@/lib/places";

// The address box: type a few letters, pick a suggestion from Google. The picked address is what gets saved,
// so if the user edits the text afterwards the pick is forgotten and they must pick again.
export default function AddressField({
  text,
  place,
  invalid,
  onText,
  onPlace,
}: {
  text: string; // what is in the box
  place: PlaceDetails | null; // the picked address (null until one is picked)
  invalid: boolean;
  onText: (text: string) => void;
  onPlace: (place: PlaceDetails | null) => void;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1); // the highlighted suggestion (arrow keys)
  const [message, setMessage] = useState<string | null>(null);
  // True once the user has left the box with typed text but no picked suggestion. Cleared as soon as they
  // type again or pick one, so it never fights with the "below" message shown while they're still choosing.
  const [abandoned, setAbandoned] = useState(false);
  const token = useRef<SessionToken | null>(null); // one per search, see lib/places.ts
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(0); // only the newest search may show its results

  useEffect(() => () => clearTimeout(timer.current), []);

  function handleChange(value: string) {
    onText(value);
    if (place) onPlace(null); // only clear an existing pick; skips a needless re-render on every other keystroke
    setMessage(null);
    setAbandoned(false);
    clearTimeout(timer.current);
    latest.current++; // drop any search still on its way
    if (value.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(() => search(value), 250); // wait until the user pauses typing
  }

  function handleBlur() {
    setOpen(false);
    setAbandoned(text.trim().length > 0 && !place);
  }

  async function search(value: string) {
    const mine = ++latest.current;
    try {
      token.current ??= await newSessionToken();
      const found = await searchAddresses(value, token.current);
      if (mine !== latest.current) return;
      setSuggestions(found);
      setActive(-1);
      setOpen(found.length > 0);
    } catch (err) {
      console.error(err);
      if (mine === latest.current) setMessage("Address search isn't available right now. Please try again later.");
    }
  }

  async function choose(suggestion: AddressSuggestion) {
    setOpen(false);
    setAbandoned(false);
    onText(suggestion.text);
    try {
      const details = await getPlaceDetails(suggestion);
      onPlace(details);
      onText(details.formattedAddress);
      token.current = null; // the search is over: the next one starts a new session
    } catch (err) {
      console.error(err);
      onPlace(null);
      setMessage("Please choose a more specific address, with a street and a city.");
    }
  }

  const belowMessage = message ?? (abandoned ? "Please choose an address from the list." : null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
    } else if (e.key === "Enter" && open && active >= 0) {
      e.preventDefault(); // pick the highlighted suggestion instead of submitting the form
      choose(suggestions[active]);
    }
  }

  return (
    <FieldShell
      id={id}
      label="Address*"
      invalid={invalid || abandoned}
      below={
        <>
          {open && (
            // No design for this list yet.
            <ul id={listId} role="listbox" className="absolute top-full z-10 mt-1 w-full border border-black bg-white">
              {suggestions.map((s, i) => (
                <li
                  key={s.prediction.placeId}
                  id={`${id}-option-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // mouse down (not click) so the box keeps focus and doesn't close before the pick registers
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(s);
                  }}
                  className={`cursor-pointer px-3 py-2 text-[14px] ${i === active ? "bg-[#f3f4f6]" : ""}`}
                >
                  {s.text}
                </li>
              ))}
              {/* Google's rules ask for this credit next to address suggestions. */}
              <li aria-hidden className="px-3 py-1 text-[11px] text-[#4b5563]">
                Powered by Google
              </li>
            </ul>
          )}
          {belowMessage && (
            <p role="alert" className="text-[13px] font-medium text-red-600">
              {belowMessage}
            </p>
          )}
        </>
      }
    >
      <input
        id={id}
        name="address"
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
        aria-invalid={invalid || abandoned}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="h-4.75 min-w-0 flex-1 bg-transparent outline-none"
      />
      {place && <span className="sr-only">Address chosen</span>}
    </FieldShell>
  );
}
