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
// The menu is the same plain box as the category filter's (category-filter.tsx): white, 1px #b8b8b8 border, sharp corners, no
// shadow, no pointer, the rows told apart by the same thin lines. (The design has a small triangle pointing up at the icon; it
// was taken out on request, 2026-09-30, so that the two popups look alike.)
//
// Rows and their text are smaller from 1120px up (desktop, the same breakpoint business-header.tsx switches on): a mouse
// doesn't need the 44px touch target a phone/tablet does, and the design has no dropdown of its own to match there anyway.
// Plain Tailwind breakpoint classes, not a JS media-query check.
const MENU_WIDTH = "w-50.75"; // 203px, the design's width

// How far below the ROOT (the 40px button box) the menu starts. The icon itself is only 25px, centred in that 40px box, so its
// own bottom edge sits 7.5px above the box's bottom edge; the menu starts 4px under THAT edge (the gap the category popup has
// under its row). Anchoring to the box (as `top-full` does) put the popup noticeably further from the icon.
const ICON_BOTTOM = (40 - 25) / 2 + 25; // 32.5
const MENU_TOP = ICON_BOTTOM + 4; // 36.5
// On the home page's black bar (`light`) the menu is further from the icon, 16.3px under it (48.8 from the top of the 40px box): the same
// distance the country picker's list has from its pin and code there (it starts 4px under a 44px button whose content ends 12.3px above
// the button's bottom edge). The owner found the 4px too tight on that bar (2026-10-02); the business pages keep the 4px.
const MENU_TOP_LIGHT = ICON_BOTTOM + 16.3; // 48.8

function MenuRow({
  href,
  children,
  onClick,
  first,
  disabled,
}: {
  href?: string;
  children: React.ReactNode;
  onClick?: () => void;
  first?: boolean;
  disabled?: boolean;
}) {
  // Same hover grey as the register page's dropdowns and the category popup (the field-hint grey at low opacity). Desktop text
  // matches the size of the nav links and "← sqrtx" beside it (header-links.tsx, business-header.tsx: both text-[14px]).
  const cls = `flex h-11 items-center px-4.25 text-[16px] hover:bg-[#4b5563]/10 min-[1120px]:h-9 min-[1120px]:text-[14px] ${
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

// `light`: for a dark bar (the home page's black one): the icon is white and the signed-in dot is ringed in black.
export default function VisitorIcon({ light = false }: { light?: boolean }) {
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
    <svg viewBox="0 0 24 24" className="ml-2 size-6.25" fill={light ? "#ffffff" : "#1d1b20"} aria-hidden>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM7.07 18.28c.43-.9 3.05-1.78 4.93-1.78s4.5.88 4.93 1.78A7.93 7.93 0 0 1 12 20a7.93 7.93 0 0 1-4.93-1.72zm11.29-1.45c-1.43-1.74-4.9-2.33-6.36-2.33s-4.93.59-6.36 2.33A7.95 7.95 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 1.82-.62 3.49-1.64 4.83zM12 6c-1.94 0-3.5 1.56-3.5 3.5S10.06 13 12 13s3.5-1.56 3.5-3.5S13.94 6 12 6zm0 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
    </svg>
  );

  const signedIn = confirmed ?? saved;
  const onNavigate = () => setOpen(false);

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
        <span aria-hidden className={`absolute top-[21.5px] left-[22px] hidden size-3 rounded-full border-2 bg-[#22c55e] group-data-signed-in:block ${light ? "border-black" : "border-white"}`} />
      </button>
      <InlineScript
        code={`{try{if(localStorage.getItem(${JSON.stringify(SAVED_LOGIN_KEY)}))document.currentScript.parentElement.setAttribute("data-signed-in","")}catch(e){}}`}
      />

      {open && (
        <div role="menu" style={{ top: light ? MENU_TOP_LIGHT : MENU_TOP }} className={`absolute right-0 z-40 flex flex-col border border-[#b8b8b8] bg-white ${MENU_WIDTH}`}>
          {signedIn ? (
            <>
              <MenuRow href="/account" onClick={onNavigate} first>
                Account
              </MenuRow>
              <MenuRow href="/account/settings" onClick={onNavigate}>
                Settings
              </MenuRow>
              <MenuRow onClick={logOut} disabled={leaving}>
                {leaving ? "Logging out…" : "Log out"}
              </MenuRow>
            </>
          ) : (
            <>
              <MenuRow href="/login" onClick={onNavigate} first>
                Log In
              </MenuRow>
              <MenuRow href="/register" onClick={onNavigate}>
                Register
              </MenuRow>
            </>
          )}
        </div>
      )}
    </div>
  );
}
