"use client";

// A script that runs while the browser is still reading the page's HTML, before the first paint: it lets a prebuilt (cached)
// page show something only the browser knows (here: who is signed in) without a visible change afterwards. From the guide
// "Preventing flash before hydration" in node_modules/next/dist/docs. It only runs on a full page load; on a client-side
// navigation the browser gets it as text/plain (React would otherwise warn about a script tag), so the component that uses
// it must also set the same thing itself (see visitor-icon.tsx's layout effect). The element that holds what the script
// changes needs suppressHydrationWarning.
// A client component on purpose: the root layout (a server component) changes when the language changes (the visitor logs in on a Serbian page and lands on an English
// one), and its script then reaches the browser as an element in a server answer, where it could not be given the text/plain type below (React warns about it).
export function InlineScript({ code }: { code: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
