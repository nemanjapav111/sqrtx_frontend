// The look of EVERY popup on the site: the location picker's (home/location-picker.tsx, the owner's design of 2026-10-08), used by the account menu (visitor-icon.tsx), the category
// filter (category-filter.tsx), the category list and the address suggestions of the forms (category-select.tsx, address-field.tsx) and the contact box of a product's page
// (item-detail.tsx), so that a change here changes them all. A white card with a thin light border (#e5e7eb), sharp corners and a soft shadow; the rows have no lines between
// them, are 44px high on a phone and 40px from 768px up (16px / 15px text), turn light grey (#f3f4f6) under the pointer or the arrow keys, and the chosen row is semibold with a
// tick. A heading is small grey text, a note ("No cities yet.") grey 14px.

/**
 * THE GAP: every popup opens 16px under what the visitor clicked, measured from what is SEEN of it (the icon, the text, the button's edge, a field's underline), not from its
 * invisible box: the location picker's gap, the owner's choice (2026-10-09: "same gap as location picker have - everywhere"). A control whose box is what you see (a button, a
 * field's underline) uses POPUP_BELOW / POPUP_BELOW_LINE; one with an icon or text on nothing (the account icon, the location, the category filter) puts the popup POPUP_GAP px under the
 * bottom of the icon or text (see their files), so the three can't drift apart.
 */
export const POPUP_GAP = 16;
/** For a trigger whose own edge is what you see (a button): the popup right under it, with the gap (Tailwind: mt-4 = 16px). */
export const POPUP_BELOW = "top-full mt-4";
/** The same, ABOVE the button, with the same gap (the contact box of a product's page, when it has no room below: item-detail.tsx). Tailwind: mb-4 = 16px. */
export const POPUP_ABOVE = "bottom-full mb-4";
/** The same for a form field: the popup hangs from the row of the input, whose 1px underline is just outside it (mt-4.25 = 16px + that line). */
export const POPUP_BELOW_LINE = "top-full mt-4.25";

/** The card itself: border, white, shadow (no padding: for a box with its own, like the contact details). */
export const POPUP_CARD = "border border-[#e5e7eb] bg-white text-black shadow-[0_8px_28px_rgba(0,0,0,0.28)]";
/** The card of a LIST of rows: 8px above the first row and under the last. */
export const POPUP_PANEL = `${POPUP_CARD} py-2`;
/** One row of a list: the text at the left, a tick or a count at the right. */
export const POPUP_ROW = "flex h-11 w-full shrink-0 cursor-pointer items-center justify-between gap-3 px-4.5 text-left text-[16px] hover:bg-[#f3f4f6] md:h-10 md:text-[15px]";
/** The row the arrow keys are on (the pointer does it by itself, see POPUP_ROW). */
export const POPUP_ROW_ON = "bg-[#f3f4f6]";
/** A heading above a group of rows. */
export const POPUP_HEADING = "px-4.5 text-[13px] leading-[1.2] font-medium text-[#8f8f8f]";
/** A line of grey text in a list ("Loading cities…", "No matching category"). */
export const POPUP_NOTE = "px-4.5 py-3 text-[14px] text-[#636363]";

/** The tick at the end of the chosen row. */
export const TICK = (
  <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
