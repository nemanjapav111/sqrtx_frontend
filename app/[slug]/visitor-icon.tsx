"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { InlineScript } from "@/app/components/inline-script";
import { POPUP_GAP, POPUP_PANEL, POPUP_ROW } from "@/app/components/popup";
import { usePopupDismiss } from "@/app/components/use-popup-dismiss";
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
// The menu has the look of every popup of the site (components/popup.tsx: the location picker's card with its soft shadow, rows without lines
// between them, light grey under the pointer), since 2026-10-09 (owner: "set other popups have the same style as location picker"); before that it
// was a plain box with a 1px #b8b8b8 border and thin lines between the rows, like the category filter's. No pointer (the design's small triangle
// was taken out on request, 2026-09-30). The rows are 44px high on a phone and 40px from 768px up, like the picker's.
const MENU_WIDTH = "w-50.75"; // 203px, the design's width

// "View my page" (first row of the signed-in menu): where the signed-in owner's own public page is, asked once and kept while the page is open.
// The answer is the same one the login uses to decide where a finished owner belongs (lib/onboarding.ts getHomePath): their page when it is
// public, otherwise the account page (a hidden page would only say "not found") or a registration step; the row is only there for a page.
// undefined: not asked yet, null: there is none to show. It is also kept in the tab's session storage (a reload shows it at once, and is
// checked again in the background) and asked for as soon as the page knows the visitor is signed in, not only when the menu is opened:
// asked on opening it arrived after the menu was already on screen, a moment late.
const MY_PAGE_KEY = "sqrtx:my-page";
let myPageCache: string | null | undefined;
let myPageAsked = false; // asked on this page load already
function readMyPage(): string | null | undefined {
  if (myPageCache !== undefined) return myPageCache;
  try {
    const kept = sessionStorage.getItem(MY_PAGE_KEY);
    return kept === null ? undefined : kept === "" ? null : kept;
  } catch {
    return undefined;
  }
}
function keepMyPage(path: string | null) {
  myPageCache = path;
  try {
    sessionStorage.setItem(MY_PAGE_KEY, path ?? "");
  } catch {}
}
function forgetMyPage() {
  myPageCache = undefined;
  myPageAsked = false;
  try {
    sessionStorage.removeItem(MY_PAGE_KEY);
  } catch {}
}

// How far below the ROOT (the 40px button box) the menu starts: POPUP_GAP (16px, the same under every popup's trigger, see popup.tsx) under the bottom of the icon. The icon itself is only
// 25px, centred in that 40px box, so its bottom edge sits 7.5px above the box's bottom edge (anchoring to the box, as `top-full` does, would put the menu further from the icon).
const ICON_BOTTOM = (40 - 25) / 2 + 25; // 32.5
const MENU_TOP = ICON_BOTTOM + POPUP_GAP; // 48.5

function MenuRow({ href, children, onClick, disabled, className = "" }: { href?: string; children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  // The row of every popup (components/popup.tsx).
  return href ? (
    <Link href={href} className={`${POPUP_ROW} ${className}`} onClick={onClick}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled} className={`disabled:cursor-wait disabled:opacity-60 ${POPUP_ROW}`}>
      {children}
    </button>
  );
}

// `light`: for a dark bar (the home page's black one): the icon is white and the signed-in dot is ringed in black.
// `businessLink`: the marketplace's way to the business landing page (/business) (2026-10-11, the owner): a link at the right of the icon on tablet and desktop, and the
// last row of the menu on a phone (the bottom bar has no room for it). Shown to everyone, signed in or not (the owner: "don't hide it"). Both are plain links in the page, so a
// crawler or a payment provider's reviewer sees them (the menu row only while the menu is open).
export default function VisitorIcon({ light = false, businessLink = false }: { light?: boolean; businessLink?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false); // is there a saved login: read when the menu is opened
  const [confirmed, setConfirmed] = useState<boolean | null>(null); // what the login library said (null: not asked)
  const [leaving, setLeaving] = useState(false);
  const [myPage, setMyPage] = useState<string | null | undefined>(() => (typeof window === "undefined" ? undefined : readMyPage()));
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
          if (!session) forgetMyPage(); // the login is gone (it expired, or was ended in another tab): the kept page is no one's
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

  // Closes on a click outside it (that click does nothing else), or on Escape: components/use-popup-dismiss.ts.
  usePopupDismiss(open, rootRef, () => setOpen(false));

  // The row stays (saying so) while the library loads and the login is dropped.
  async function logOut() {
    setLeaving(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      await supabase.auth.signOut({ scope: "local" });
      forgetMyPage(); // the next person to sign in in this tab has their own page
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

  // As soon as the visitor is known to be signed in: ask once per page load where their own page is (this loads the API helpers, which a plain
  // visitor never does). If it can't be asked now, what was kept stays (or the row is simply left out).
  useEffect(() => {
    if (!signedIn || myPageAsked) return;
    myPageAsked = true;
    let cancelled = false;
    (async () => {
      try {
        const { getHomePath } = await import("@/lib/onboarding");
        const path = await getHomePath();
        keepMyPage(path === "/account" || path.startsWith("/register") ? null : path);
      } catch {
        myPageAsked = false; // try again next time
        return;
      }
      if (!cancelled) setMyPage(myPageCache);
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);
  const onNavigate = () => setOpen(false);

  return (
    <div className="group/account flex items-center">
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
        <div role="menu" style={{ top: MENU_TOP }} className={`absolute right-0 z-40 flex flex-col ${POPUP_PANEL} ${MENU_WIDTH}`}>
          {signedIn ? (
            <>
              {myPage && (
                <MenuRow href={myPage} onClick={onNavigate}>
                  View my page
                </MenuRow>
              )}
              <MenuRow href="/account" onClick={onNavigate}>
                Account
              </MenuRow>
              <MenuRow href="/account/settings" onClick={onNavigate}>
                Settings
              </MenuRow>
              {businessLink && (
                <MenuRow href="/business" onClick={onNavigate} className="md:hidden">
                  For businesses
                </MenuRow>
              )}
              <MenuRow onClick={logOut} disabled={leaving}>
                {leaving ? "Logging out…" : "Log out"}
              </MenuRow>
            </>
          ) : (
            <>
              <MenuRow href="/login" onClick={onNavigate}>
                Log In
              </MenuRow>
              <MenuRow href="/register" onClick={onNavigate}>
                Register
              </MenuRow>
              {businessLink && (
                <MenuRow href="/business" onClick={onNavigate} className="md:hidden">
                  For businesses
                </MenuRow>
              )}
            </>
          )}
        </div>
      )}
    </div>
    {businessLink && (
      <Link
        href="/business"
        className={`ml-1.5 hidden h-8 items-center border px-3 text-[14px] leading-4 font-medium whitespace-nowrap md:flex min-[1120px]:mr-1.75 ${light ? "border-[#a3a3a3] text-[#d4d4d4] hover:border-white hover:text-white focus-visible:border-white focus-visible:text-white" : "border-[#4b5563] text-[#4b5563] hover:border-black hover:text-black focus-visible:border-black focus-visible:text-black"}`}
      >
        For businesses
      </Link>
    )}
    </div>
  );
}
