"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FieldShell } from "@/app/components/field";
import {
  AddressTooVagueError,
  getPlaceDetails,
  newSessionToken,
  searchAddresses,
  type AddressSuggestion,
  type PlaceDetails,
  type SessionToken,
} from "@/lib/places";

const PICK = "Please choose an address from the list.";
const NO_RESULTS = "No matching address found. Try adding the street and city.";

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
  const [message, setMessage] = useState<string | null>(null); // a problem with the search or the pick
  // True once the user has left the box with typed text but no picked suggestion. Cleared as soon as they
  // type again or pick one, so it never fights with the message shown while they're still choosing.
  const [abandoned, setAbandoned] = useState(false);
  const [pending, setPending] = useState(false); // a pick is loading its details: the address is coming, so don't complain about it
  const [noResults, setNoResults] = useState(false); // the last search for the current text found nothing
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
    setActive(-1); // the old highlight points into the old list
    clearTimeout(timer.current);
    latest.current++; // drop any search or pick still on its way
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
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
      setSuggestions(found);
      setNoResults(found.length === 0);
      setActive(-1);
    } catch (err) {
      console.error(err);
      if (mine !== latest.current) return;
      setSuggestions([]);
      setMessage("Address search isn't available right now. Please try again later.");
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
        setMessage("Please choose a more specific address, with a street and a city.");
      } else {
        setMessage("We couldn't load that address. Please try again.");
      }
    }
  }

  // The gray hint turns red when the user leaves without picking (or hits Next without one).
  // While a pick is loading there is nothing to complain about.
  const belowMessage = message ?? (!pending && (abandoned || (invalid && !open && !place)) ? PICK : null);
  const listOpen = open && !belowMessage && suggestions.length > 0;
  // The hint sits on the same line as the error, so it takes no extra space. It steps aside for an error,
  // for the suggestion list (which covers that line) and once an address is picked.
  const hint = !belowMessage && !listOpen && !place ? (noResults ? NO_RESULTS : PICK) : null;
  // For screen readers: results and the pick appear without moving focus, so they are announced from here.
  const status = place
    ? "Address chosen"
    : pending
      ? "Loading address"
      : listOpen
        ? `${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"} available`
        : noResults
          ? NO_RESULTS
          : "";

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
      label="Address*"
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
                // 44px tall on phones so a thumb can hit it, tighter with a mouse
                className={`flex min-h-11 cursor-pointer items-center px-3 text-[14px] hover:bg-[#f3f4f6] md:min-h-0 md:py-2 ${i === active ? "bg-[#f3f4f6]" : ""}`}
              >
                {s.text}
              </li>
            ))}
            {/* Google's rules ask for this credit next to address suggestions. */}
            <li aria-hidden className="px-3 py-1 text-[11px] text-[#4b5563]">
              Powered by Google
            </li>
          </ul>
        )
      }
    >
      <input
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
      <span role="status" className="sr-only">
        {status}
      </span>
    </FieldShell>
  );
}
