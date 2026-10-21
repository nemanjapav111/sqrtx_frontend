"use client";

import { useEffect, useRef, type RefObject } from "react";

// How EVERY popup that opens from a button closes (the location list, the account menu, the category filter, the contact box of a product's page; the owner, 2026-10-11): Escape, or
// a click OUTSIDE it, and that click does nothing else. It only closes the popup: the button, link or photo under the pointer is not pressed, a link is not followed and a text box is not
// focused (the next click does it). `root` is the box holding the button AND the popup, so a click on the button still toggles it.
//
// It is a completed click (or tap) that closes it, not the start of a press, so a finger that starts a scroll outside does not close it, and a press that starts inside the popup (selecting
// text) and ends outside does not either. Keyboard: Tab away leaves it open, as before.
export function usePopupDismiss(open: boolean, root: RefObject<HTMLElement | null>, close: () => void) {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    if (!open) return;
    let pressedOutside = false;
    // [data-popup-portal]: a part of the popup drawn elsewhere in the page (the product contact sheet on a phone), which `root` does not contain.
    const outside = (e: Event) => !!root.current && !root.current.contains(e.target as Node) && !(e.target as Element).closest?.("[data-popup-portal]");
    const onDown = (e: PointerEvent) => {
      pressedOutside = outside(e);
    };
    // A mouse press outside must not focus a box or start selecting text there.
    const onMouseDown = (e: MouseEvent) => {
      if (outside(e)) e.preventDefault();
    };
    // Capture phase on the document: it comes before every other handler (React's included), and stopping it here means nobody else hears this click.
    const onClick = (e: MouseEvent) => {
      const swallow = pressedOutside && outside(e);
      pressedOutside = false;
      if (!swallow) return;
      e.preventDefault();
      e.stopPropagation();
      closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, root]);
}
