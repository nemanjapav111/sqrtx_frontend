"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useBusinessBase } from "@/app/[lang]/components/business-link";
import { useBusinessText } from "./search-context";

// What a visitor first learns about the business, on its opening page (page.tsx): where it is (city and state, a small grey line) and the first
// two lines of its About text, with "Read more" leading to the About page. The link only shows when the text is really cut off: it is measured
// (and measured again when the width changes, e.g. a phone turned sideways), so a short text has no pointless link.
export interface BusinessIntroData {
  place: string; // "New York, NY"
  about: string | null;
}

export default function BusinessIntro({ intro, slug }: { intro: BusinessIntroData; slug: string }) {
  const base = useBusinessBase(slug);
  const t = useBusinessText();
  const text = intro.about?.trim() ?? "";
  const paragraph = useRef<HTMLParagraphElement>(null);
  const [cut, setCut] = useState<boolean | null>(null); // null: not measured yet (the server render, and the moment after a load)

  useEffect(() => {
    const el = paragraph.current;
    if (!el) return;
    const measure = () => setCut(el.scrollHeight > el.clientHeight + 1);
    measure();
    const watcher = new ResizeObserver(measure);
    watcher.observe(el);
    return () => watcher.disconnect();
  }, [text]);

  if (!intro.place && !text) return null;

  // The link's row is in the page from the first paint, as the text can only be measured in the browser: a row that appeared after that moved
  // everything below it. So the server guesses from the length (about 45 characters to a line on a phone, 90 at desktop width) and shows the
  // link at once when the text is likely cut, so it does not blink in on a reload either: a text that surely fits has no row; a text that is cut
  // on a phone only has it on phones. Once measured, a link that was wrong turns invisible (its row stays, nothing moves).
  const newlines = text.split("\n").length - 1;
  const longText = text.length > 170 || newlines >= 2;
  const linkClass = cut ? "" : text.length > 80 || longText ? `${cut === false ? "invisible " : ""}${longText ? "" : "md:hidden"}` : "hidden";

  return (
    <section className="mb-5.5 flex flex-col gap-2 border-b border-[#bcd9d9] pb-4.5">
      {intro.place && (
        <p className="flex items-center gap-1.25 text-[13px] font-semibold text-[#4b5563]">
          <svg aria-hidden viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
          {intro.place}
        </p>
      )}
      {text && (
        <>
          <p ref={paragraph} className="line-clamp-2 max-w-170 text-[16px] leading-6 wrap-break-word whitespace-pre-line text-[#111]">
            {text}
          </p>
          <Link href={`${base}/about`} aria-hidden={cut === false} tabIndex={cut === false ? -1 : undefined} className={`w-fit text-[14px] leading-5 font-semibold underline ${linkClass}`}>
            {t.readMore}
          </Link>
        </>
      )}
    </section>
  );
}
