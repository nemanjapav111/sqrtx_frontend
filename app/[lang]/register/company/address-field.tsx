"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FieldShell } from "@/app/[lang]/components/field";
import { useCommonText } from "@/app/[lang]/components/lang-context";
import { POPUP_BELOW_LINE, POPUP_PANEL } from "@/app/[lang]/components/popup";
import { fill } from "@/lib/i18n";
import {
  AddressTooVagueError,
  getPlaceDetails,
  newSessionToken,
  searchAddresses,
  type AddressSuggestion,
  type PlaceDetails,
  type SessionToken,
} from "@/lib/places";

// The texts (common.address): `start` is the gray hint before anything is typed, `pick` the red one.

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
  const t = useCommonText().address;
  const listId = `${id}-list`;
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1); // the highlighted suggestion (arrow keys)
  const [message, setMessage] = useState<string | null>(null); // a problem with the search or the pick
  // True once the user has left the box with typed text but no picked suggestion. Cleared as soon as they
  // type again or pick one, so it never fights with the message shown while they're still choosing.
  const [abandoned, setAbandoned] = useState(false);
  const [pending, setPending] = useState(false); // a pick is loading its details: the address is coming, so don't complain about it
  const [noResults, setNoResults] = useState(false); // the last search for the current text found nothing
  const [searching, setSearching] = useState(false); // a search is waiting for Google's answer: show the spinner
  const input = useRef<HTMLInputElement>(null);
  const token = useRef<SessionToken | null>(null); // one per search, see lib/places.ts
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Counts every search and every pick. Each async step remembers its number and gives up if a newer one
  // started meanwhile (the user typed, cleared the box or picked something else), so old answers never land late.
  const latest = useRef(0);
  const touched = useRef(false); // the user has typed or picked something, so an empty box is a decision, not a fresh field

  useEffect(() => () => clearTimeout(timer.current), []);

  // Focus, a click on the box (which may already have focus) or an arrow key: show the list again.
  function reopen() {
    setOpen(true);
    setAbandoned(false); // the red line comes back when they leave, if they still haven't picked
    if (suggestions.length > 0) setMessage(null); // a failed pick's message steps aside so they can try again
  }

  function handleChange(value: string) {
    touched.current = true;
    setOpen(true); // the list may have been closed by a pick or Escape while the box kept focus
    onText(value);
    if (place) onPlace(null); // only clear an existing pick; skips a needless re-render on every other keystroke
    setMessage(null);
    setAbandoned(false);
    setPending(false);
    setNoResults(false);
    setSearching(false);
    setActive(-1); // the old highlight points into the old list
    clearTimeout(timer.current);
    latest.current++; // drop any search or pick still on its way
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true); // from the first keystroke on, so the spinner also covers the typing pause
    timer.current = setTimeout(() => search(value), 250); // wait until the user pauses typing
  }

  function handleBlur() {
    setOpen(false);
    setAbandoned((text.trim().length > 0 || touched.current) && !place && !pending);
  }

  async function search(value: string) {
    const mine = ++latest.current;
    try {
      // Two searches can both wait for Google's script to load: the first token made wins, so they share one session.
      const fresh = token.current ?? (await newSessionToken());
      token.current ??= fresh;
      const found = await searchAddresses(value, token.current);
      if (mine !== latest.current) return;
      setSearching(false);
      setSuggestions(found);
      setNoResults(found.length === 0);
      setActive(-1);
    } catch (err) {
      console.error(err);
      if (mine !== latest.current) return;
      setSearching(false);
      setSuggestions([]);
      setMessage(t.unavailable);
    }
  }

  async function choose(suggestion: AddressSuggestion) {
    touched.current = true;
    clearTimeout(timer.current); // a search still waiting for the typing pause must not reopen the list
    const mine = ++latest.current; // also drops a search in flight and an earlier pick still loading
    const session = token.current;
    const before = suggestions; // put back if this pick fails, so they can try again or pick another
    setOpen(false);
    setAbandoned(false);
    setActive(-1);
    setMessage(null);
    setNoResults(false);
    setSearching(false);
    setPending(true);
    setSuggestions([]); // so clicking the box again doesn't show the list of what was already picked
    onText(suggestion.text);
    onPlace(null); // an earlier pick doesn't belong to this text
    try {
      const details = await getPlaceDetails(suggestion);
      if (token.current === session) token.current = null; // the search is over: the next one starts a new session
      if (mine !== latest.current) return; // the user typed or picked again while this loaded: it's not theirs anymore
      setPending(false);
      onPlace(details);
      onText(details.formattedAddress);
    } catch (err) {
      const vague = err instanceof AddressTooVagueError; // an ordinary thing to pick, not a fault
      if (!vague) console.error(err);
      if (mine !== latest.current) return;
      setPending(false);
      setSuggestions(before);
      if (vague) {
        if (token.current === session) token.current = null; // Google did answer, so that search is over too
        setMessage(t.vague);
      } else {
        setMessage(t.loadFailed);
      }
    }
  }

  // The gray hint turns red when the user leaves without picking (or hits Next without one).
  // While a pick is loading there is nothing to complain about.
  const belowMessage = message ?? (!pending && (abandoned || (invalid && !open && !place)) ? t.pick : null);
  const listOpen = open && !belowMessage && suggestions.length > 0;
  // The hint sits on the same line as the error, so it takes no extra space. It steps aside for an error,
  // for the suggestion list (which covers that line) and once an address is picked.
  const hint = !belowMessage && !listOpen && !place ? (noResults ? t.noResults : t.start) : null;
  // For screen readers: results and the pick appear without moving focus, so they are announced from here.
  const status = place
    ? t.chosen
    : pending
      ? t.loadingAddress
      : listOpen
        ? suggestions.length === 1
          ? t.suggestionsOne
          : fill(t.suggestionsMany, { n: suggestions.length })
        : noResults
          ? t.noResults
          : "";

  // The × at the end of the line: empty the box and start over with the cursor in it.
  function clear() {
    handleChange("");
    touched.current = false; // an emptied box is a fresh field again, so no red line until they leave it with something typed
    input.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      reopen();
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      reopen();
      setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
    } else if (e.key === "Enter" && listOpen && suggestions[active]) {
      e.preventDefault(); // pick the highlighted suggestion instead of submitting the form
      choose(suggestions[active]);
    }
  }

  return (
    <FieldShell
      id={id}
      label={t.label}
      invalid={invalid || abandoned}
      message={
        belowMessage ? (
          <p role="alert" className="text-[13px] font-medium text-red-600">{belowMessage}</p>
        ) : hint ? (
          <p className="text-[13px] font-medium text-[#4b5563]">{hint}</p>
        ) : null
      }
      dropdown={
        // Anchored right under the input line itself, so it doesn't drift when a message reserves space below it.
        listOpen && (
          // The look of every popup of the site (components/popup.tsx).
          <ul id={listId} role="listbox" className={`absolute ${POPUP_BELOW_LINE} z-10 w-full ${POPUP_PANEL}`}>
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
                // 44px tall on phones so a thumb can hit it, 40px with a mouse; light grey under the pointer and the arrow keys, like the rows of every popup.
                className={`flex min-h-11 cursor-pointer items-center px-4.5 py-2 text-[16px] hover:bg-[#f3f4f6] md:min-h-10 md:text-[15px] ${i === active ? "bg-[#f3f4f6]" : ""}`}
              >
                {s.text}
              </li>
            ))}
            {/* Google's rules ask for this credit next to address suggestions. */}
            <li aria-hidden className="px-4.5 pt-1 text-[11px] text-[#8f8f8f]">
              {t.poweredBy}
            </li>
          </ul>
        )
      }
    >
      <input
        ref={input}
        id={id}
        name="address"
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={listOpen}
        aria-controls={listOpen ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={listOpen && active >= 0 ? `${id}-option-${active}` : undefined}
        aria-invalid={invalid || abandoned}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={reopen}
        onClick={reopen} // also reopens the list when the box already has focus (after a pick or Escape)
        onBlur={handleBlur}
        className="h-4.75 min-w-0 flex-1 bg-transparent outline-none"
      />
      {/* At the end of the line (19px tall like the input, so the row doesn't grow when the first character is typed): a spinner while Google answers, the green check once an address is picked, and an × to start over. */}
      {searching || pending ? (
        <svg aria-hidden viewBox="0 0 20 20" className="size-4.75 shrink-0 animate-spin motion-reduce:animate-none" fill="none" strokeWidth="2.5">
          <circle cx="10" cy="10" r="7.5" stroke="#d1d5db" />
          <path d="M10 2.5a7.5 7.5 0 0 1 7.5 7.5" stroke="black" strokeLinecap="round" />
        </svg>
      ) : place ? (
        <svg aria-hidden viewBox="0 0 20 20" className="size-4.75 shrink-0" fill="none" stroke="#009a1c" strokeWidth="2.5">
          <path d="M4.5 10.5l3.5 3.5L15.5 6" />
        </svg>
      ) : null}
      {text.length > 0 && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()} // keep the focus in the box, so leaving it doesn't flash the red line
          onClick={clear}
          aria-label={t.clear}
          className="ml-1 flex size-4.75 shrink-0 cursor-pointer items-center justify-center text-[#737373] hover:text-black focus-visible:text-black focus-visible:outline-2 focus-visible:outline-black"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      )}
      <span role="status" className="sr-only">
        {status}
      </span>
    </FieldShell>
  );
}
