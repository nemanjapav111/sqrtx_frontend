"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { InlineScript } from "@/app/components/inline-script";
import { SAVED_LOGIN_KEY, hasSavedLogin } from "@/lib/saved-login";

// The account icon at the right of the top bar (Figma "visitor_icon" opens "visitor_account_dropdown", node 495:51):
// tapping or clicking it opens a small menu right under it. The design only shows the signed-OUT menu (Log In / Register,
// real wording from the design); the signed-in one has no design yet, so its three rows (Account, Settings, Log out)
// and their wording are a placeholder, built in the same box/row style as the designed menu.
//
// Who is signed in: the login library (lib/supabase.ts, ~61 KB) is NOT loaded for a visitor. A small green dot on the icon
// (a placeholder colour and place, not in the design) shows a saved login, which is read straight from the browser's storage
// (lib/saved-login.ts): by a script that runs before the first paint (so the cached page never shows the dot late), and again
// in a layout effect for client-side navigations. Only a browser that holds a saved login loads the library, to confirm it
// (it may have expired) and to log out; the dot follows what it says. The menu opens with the saved login as its answer: Account
// and Settings are plain links, and "Log out" loads the library when it is pressed.
// The box: white, 1px #b8b8b8 border, sharp corners, no shadow, with a small triangle pointing up at the icon.
//
// The panel and its pointer are ONE traced outline (a single <path>, the same way the Figma design builds it: a
// boolean union of the box and the pointer). It is drawn TWICE though, as two stacked <svg>s around the row content
// rather than once: a plain white fill behind the rows, and the stroke alone again on top of the rows (see the
// "menu" div below for why). Earlier this was two separate CSS boxes (a plain panel plus a rotated square for the
// pointer) glued together with a negative margin: rotating an element always makes the browser paint it in a later
// phase than a plain one, so the "rotated square" kept ending up on top of the panel instead of tucked behind it as
// intended, drawing a stray line across the pointer where the panel's own border crossed it. One continuous shape
// (even split into a fill copy and a stroke copy) can't have that problem.
//
// Rows and their text are smaller from 1120px up (desktop, the same breakpoint business-header.tsx switches on): a
// mouse doesn't need the 44px touch target a phone/tablet does, and the design has no dropdown of its own to match
// there anyway. So there are two panels below, not one: the same content, sized two ways, each shown by a plain
// Tailwind breakpoint class (the same pattern business-header.tsx already uses for its tablet-only links row and its
// desktop-only middle row) rather than a JS media-query check.
const WIDTH = 203; // the design's width, in px (matches MENU_WIDTH below)
const MENU_WIDTH = "w-50.75"; // 203px
const ROW_HEIGHT = 44; // a tap target, matches the design
const ROW_HEIGHT_DESKTOP = 36; // h-9, the same height as the desktop search box next to it (header-search.tsx)
const POINTER_HEIGHT = 8;
const POINTER_HALF_WIDTH = 7;
// The icon sits a bit right of its 40px button's true centre (it has an 8px left margin and no matching right margin),
// so the pointer's tip is aimed at the icon itself, not the button: 19.5px in from the button's (and so the menu's)
// right edge.
const TIP_X = WIDTH - 19.5;

// How far below the ROOT (the 40px button box) the menu starts. The icon itself is only 25px, centred in that 40px
// box, so its own bottom edge sits 7.5px above the box's bottom edge; anchoring the gap to the box (as `top-full`
// does) put the popup noticeably further from the icon than it looked like it should be. This anchors it to the
// icon's actual bottom edge instead, with a small 4px gap up to the pointer's tip (which itself sits 0.5px inside
// the svg's own top edge, see outlinePath).
const ICON_BOTTOM = (40 - 25) / 2 + 25; // 32.5
const MENU_TOP = ICON_BOTTOM + 4 - 0.5; // 36

/** The combined outline of the panel and its pointer, as one path: box top edge, up to the tip, back down, then the
 * rest of the box. Traced 0.5px in from each edge so the 1px stroke isn't clipped by the SVG's own bounds. */
function outlinePath(rows: number, rowHeight: number): string {
  const boxTop = POINTER_HEIGHT;
  const boxBottom = POINTER_HEIGHT + rows * rowHeight - 1;
  const left = 0.5;
  const right = WIDTH - 0.5;
  const top = 0.5;
  return [
    `M ${left} ${boxTop}`,
    `L ${TIP_X - POINTER_HALF_WIDTH} ${boxTop}`,
    `L ${TIP_X} ${top}`,
    `L ${TIP_X + POINTER_HALF_WIDTH} ${boxTop}`,
    `L ${right} ${boxTop}`,
    `L ${right} ${boxBottom}`,
    `L ${left} ${boxBottom}`,
    "Z",
  ].join(" ");
}

function MenuRow({
  href,
  children,
  onClick,
  first,
  compact,
  disabled,
}: {
  href?: string;
  children: React.ReactNode;
  onClick?: () => void;
  first?: boolean;
  compact: boolean;
  disabled?: boolean;
}) {
  // Same hover grey as the register page's dropdowns (category-select.tsx, address-field.tsx): the field-hint grey
  // at low opacity, so it reads as "highlighted", not a different, unrelated colour. Desktop text matches the size
  // of the nav links and "← sqrtx" beside it (header-links.tsx, business-header.tsx: both text-[14px]).
  const cls = `flex items-center px-4.25 hover:bg-[#4b5563]/10 ${compact ? "h-9 text-[14px]" : "h-11 text-[16px]"} ${
    first ? "" : "border-t border-[#b8b8b8]"
  }`;
  return href ? (
    <Link href={href} className={cls} onClick={onClick}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled} className={`w-full cursor-pointer text-left disabled:cursor-wait disabled:opacity-60 ${cls}`}>
      {children}
    </button>
  );
}

export default function VisitorIcon() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false); // is there a saved login: read when the menu is opened
  const [confirmed, setConfirmed] = useState<boolean | null>(null); // what the login library said (null: not asked)
  const [leaving, setLeaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // The dot lives in an attribute of the root (see the script below), not in React state, so it can be there before React is.
  const showDot = (on: boolean) => rootRef.current?.toggleAttribute("data-signed-in", on);

  // Client-side navigations get no script (see inline-script.tsx): the same thing, before the page is painted.
  useLayoutEffect(() => {
    showDot(hasSavedLogin());
  }, []);

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | undefined;
    // Only a browser with a saved login loads the library: to ask if the login is still good (it renews one that is only
    // old and drops one that is gone), and to hear about signing in or out.
    if (hasSavedLogin()) {
      import("@/lib/supabase").then(({ supabase }) => {
        if (cancelled) return;
        const answer = (session: unknown) => {
          showDot(!!session);
          setConfirmed(!!session);
        };
        supabase.auth.getSession().then(({ data }) => !cancelled && answer(data.session));
        subscription = supabase.auth.onAuthStateChange((_event, session) => answer(session)).data.subscription;
      });
    }
    // Another tab signed in or out: the saved login changed.
    const onStorage = () => showDot(hasSavedLogin());
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      subscription?.unsubscribe();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Closes on a click outside the icon/menu, or on Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // The row stays (saying so) while the library loads and the login is dropped.
  async function logOut() {
    setLeaving(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      await supabase.auth.signOut({ scope: "local" });
      router.push("/login");
    } catch {
      setLeaving(false);
    }
  }

  // Material "account_circle", 25px in the design, 8px in from the left of its 40px box
  const icon = (
    <svg viewBox="0 0 24 24" className="ml-2 size-6.25" fill="#1d1b20" aria-hidden>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM7.07 18.28c.43-.9 3.05-1.78 4.93-1.78s4.5.88 4.93 1.78A7.93 7.93 0 0 1 12 20a7.93 7.93 0 0 1-4.93-1.72zm11.29-1.45c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33A7.95 7.95 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.49-1.64 4.83zM12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6zm0 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
    </svg>
  );

  const signedIn = confirmed ?? saved;
  const rows = signedIn ? 3 : 2;
  const onNavigate = () => setOpen(false);

  // One panel, sized either the phone/tablet way or the desktop way (see the file comment for why there are two).
  function panel(compact: boolean) {
    const rowHeight = compact ? ROW_HEIGHT_DESKTOP : ROW_HEIGHT;
    const height = POINTER_HEIGHT + rows * rowHeight;
    const path = outlinePath(rows, rowHeight);
    return (
      <div
        role="menu"
        style={{ top: MENU_TOP, height }}
        className={`absolute right-0 z-40 ${MENU_WIDTH} ${compact ? "hidden min-[1120px]:block" : "min-[1120px]:hidden"}`}
      >
        {/* The panel's white fill, behind the rows. No stroke here: the border is drawn again, on top of the
            rows (below), so a hovered row's own background never paints over it. */}
        <svg aria-hidden width={WIDTH} height={height} viewBox={`0 0 ${WIDTH} ${height}`} className="absolute inset-0">
          <path d={path} fill="white" />
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col" style={{ top: POINTER_HEIGHT }}>
          {signedIn ? (
            <>
              <MenuRow href="/account" onClick={onNavigate} first compact={compact}>
                Account
              </MenuRow>
              <MenuRow href="/account/settings" onClick={onNavigate} compact={compact}>
                Settings
              </MenuRow>
              <MenuRow onClick={logOut} disabled={leaving} compact={compact}>
                {leaving ? "Logging out…" : "Log out"}
              </MenuRow>
            </>
          ) : (
            <>
              <MenuRow href="/login" onClick={onNavigate} first compact={compact}>
                Log In
              </MenuRow>
              <MenuRow href="/register" onClick={onNavigate} compact={compact}>
                Register
              </MenuRow>
            </>
          )}
        </div>
        {/* The same outline again, stroke only (no fill, so it hides nothing underneath). Plain, untransformed
            siblings paint in DOM order, so being last here keeps the 1px border visible even where a row above
            it is hovered. pointer-events-none so clicks still reach the rows underneath it. */}
        <svg
          aria-hidden
          width={WIDTH}
          height={height}
          viewBox={`0 0 ${WIDTH} ${height}`}
          className="pointer-events-none absolute inset-0"
        >
          <path d={path} fill="none" stroke="#b8b8b8" strokeWidth="1" />
        </svg>
      </div>
    );
  }

  return (
    <div ref={rootRef} suppressHydrationWarning className="group relative flex size-10 items-center">
      <button
        type="button"
        aria-label="Your account"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setSaved(hasSavedLogin());
          setOpen((v) => !v);
        }}
        className="relative flex size-10 cursor-pointer items-center after:absolute after:-inset-0.5"
      >
        {icon}
        {/* The signed-in dot, at the icon's lower right (the circle's edge at 45 degrees), ringed in white. Hidden until the
            root has data-signed-in. */}
        <span aria-hidden className="absolute top-[21.5px] left-[22px] hidden size-3 rounded-full border-2 border-white bg-[#22c55e] group-data-signed-in:block" />
      </button>
      <InlineScript
        code={`{try{if(localStorage.getItem(${JSON.stringify(SAVED_LOGIN_KEY)}))document.currentScript.parentElement.setAttribute("data-signed-in","")}catch(e){}}`}
      />

      {open && (
        <>
          {panel(false)}
          {panel(true)}
        </>
      )}
    </div>
  );
}
