"use client";

import { useEffect, useRef, useState } from "react";
import { useCommonText } from "./lang-context";

// A small square button that takes the visitor back to the top of a long page, shown once they have scrolled about two screens down (the lists load more as
// you scroll, so a long one is a long way back). In the root layout, so every page has it; a short page never scrolls far enough to show it. On a phone it floats
// above the bottom bar of the marketplace and of a business's pages; a business page's language card (z-30) covers it while the card is open. It is meant to be
// quiet: white with a thin line, rising in and sinking away, filled black only under the pointer. Hidden, it is also out of the tab order and the screen reader's reach.
// The way up is NOT a scroll (2026-10-15, the owner: the products rushing past "attack the eyes"): a page of 50 cards flying by in half a second is a strobe, whatever the easing.
// The page's content (<main>: the products or services, not the top bar or the bottom bar, which stay still) fades out, the page jumps to the top while it is invisible, and the content fades back in: calm at any length. Reduced motion: it just jumps.
const SHOW_AFTER_SCREENS = 2;
const FADE_OUT_MS = 170;
const FADE_IN_MS = 420;

export default function BackToTop() {
  const label = useCommonText().backToTop;
  const [visible, setVisible] = useState(false);
  const going = useRef(false); // a second tap during the fade does nothing

  useEffect(() => {
    const update = () => setVisible(window.scrollY > window.innerHeight * SHOW_AFTER_SCREENS);
    addEventListener("scroll", update, { passive: true });
    return () => removeEventListener("scroll", update);
  }, []);

  const goTop = async () => {
    const page = document.querySelector("main") ?? document.documentElement;
    if (going.current) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || typeof page.animate !== "function") {
      window.scrollTo(0, 0);
      return;
    }
    going.current = true;
    try {
      await page.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_OUT_MS, easing: "ease-in", fill: "forwards" }).finished;
      window.scrollTo({ top: 0, behavior: "instant" });
      const back = page.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_IN_MS, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)", fill: "forwards" });
      await back.finished;
    } catch {
      // interrupted (the page went away): nothing to undo
    } finally {
      for (const a of page.getAnimations()) a.cancel(); // back to the page's own opacity
      going.current = false;
    }
  };

  return (
    <button
      type="button"
      onClick={() => void goTop()}
      aria-label={label}
      title={label}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`fixed right-3 bottom-[calc(70px+env(safe-area-inset-bottom))] z-20 flex size-9.5 cursor-pointer items-center justify-center border border-[#d4d4d4] bg-white text-[#1a1a1a] shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-[opacity,translate,background-color,color,scale] duration-300 ease-out hover:border-black hover:bg-black hover:text-white active:scale-95 md:right-5 md:bottom-5 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2.5 opacity-0"
      }`}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
      </svg>
    </button>
  );
}
