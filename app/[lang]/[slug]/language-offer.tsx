"use client";

import { useState, useSyncExternalStore } from "react";
import { useLang } from "@/app/[lang]/components/lang-context";
import { OFFER, addressInLanguage, languageFromHeader, type Locale } from "@/lib/i18n";
import { readLanguageCookie, writeLanguageCookie } from "@/lib/language-cookie";

// "This page is also available in <your language>": a small card at a business's page when the visitor's language (the one they chose on sqrtx, else the
// browser's) is not the page's. A business's address is kept by a CDN, one copy per address, so the page cannot switch language by itself (lib/i18n.ts):
// this is the visitor's way to the copy in theirs. It is drawn in the visitor's language, after the page has loaded (nothing on the page moves: the card floats),
// and "Close" remembers, in this browser, which language it was for.
const KEY = "sqrtx:language-offer-closed";

const preferredLanguage = (): Locale | null => readLanguageCookie() ?? languageFromHeader(navigator.languages.join(","));

// The language to offer, or null: read from the browser (cookie, browser languages, localStorage), so it is null on the server and on the first paint.
const noChange = () => () => {};
const languageToOffer = (lang: Locale): Locale | null => {
  const wanted = preferredLanguage();
  if (!wanted || wanted === lang) return null;
  try {
    if (localStorage.getItem(KEY) === wanted) return null;
  } catch {}
  return wanted;
};

export default function LanguageOffer() {
  const lang = useLang();
  const wanted = useSyncExternalStore(noChange, () => languageToOffer(lang), () => null);
  const [closed, setClosed] = useState(false);
  const offer = closed ? null : wanted;

  if (!offer) return null;
  const text = OFFER[offer];
  const close = () => {
    try {
      localStorage.setItem(KEY, offer);
    } catch {}
    setClosed(true);
  };
  const show = () => {
    writeLanguageCookie(offer);
    window.location.assign(addressInLanguage(window.location.pathname, offer) + window.location.search);
  };
  return (
    <div
      role="region"
      lang={offer}
      className="fixed inset-x-3 bottom-18 z-30 flex items-center gap-3 border border-[#d4d4d4] bg-white py-2.5 pr-2 pl-4 text-[14px] leading-5 shadow-[0_6px_24px_rgba(0,0,0,0.16)] md:inset-x-auto md:right-5 md:bottom-5 md:max-w-105"
    >
      <p className="min-w-0 flex-1">
        {text.text}{" "}
        <button type="button" onClick={show} className="cursor-pointer font-semibold underline">
          {text.action}
        </button>
      </p>
      <button type="button" onClick={close} aria-label={text.dismiss} className="flex size-9 shrink-0 cursor-pointer items-center justify-center text-[#636363]">
        <svg aria-hidden viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
