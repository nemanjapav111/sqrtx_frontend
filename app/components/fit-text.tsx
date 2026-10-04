"use client";

import { useLayoutEffect, useRef, useState } from "react";

// The description in a services row (business-service-list and marketplace Services page). On a phone the row is one column and the text
// is cut after 8 lines. From 700px of content the text sits beside the photo and must end where the photo ends, so it gets all the height that
// is left under the name, the price and the button and is cut, with "…", after the last whole line that fits: how many lines that is depends on
// how long the name is (one line or two) and on the company block above it on the marketplace page, so it is measured, not guessed.
// Used inside a flex column that has a fixed height from 700px up (the text's box is `flex-1` there). Before the first measurement (the server's
// HTML) 4 lines are shown, which fit in every layout, so nothing hangs out of the row for a moment.
const LINE_PX = 20; // leading-5

export default function FitText({ text }: { text: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState(4);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setLines(Math.max(1, Math.floor(el.clientHeight / LINE_PX)));
    measure();
    const watcher = new ResizeObserver(measure);
    watcher.observe(el);
    return () => watcher.disconnect();
  }, []);

  return (
    <div ref={box} className="@min-[700px]:min-h-0 @min-[700px]:flex-1 @min-[700px]:overflow-hidden">
      {/* Phone: 8 lines. Wider: as many lines as the box has room for (a custom property the measurement sets). Line breaks the owner typed are kept. */}
      <p
        style={{ "--fit-lines": lines } as React.CSSProperties}
        className="line-clamp-8 text-[16px] leading-5 whitespace-pre-line text-[#111] wrap-break-word @min-[700px]:line-clamp-(--fit-lines)"
      >
        {text}
      </p>
    </div>
  );
}
