// A script that runs while the browser is still reading the page's HTML, before the first paint: it lets a prebuilt (cached)
// page show something only the browser knows (here: who is signed in) without a visible change afterwards. From the guide
// "Preventing flash before hydration" in node_modules/next/dist/docs. It only runs on a full page load; on a client-side
// navigation the browser gets it as text/plain (React would otherwise warn about a script tag), so the component that uses
// it must also set the same thing itself (see visitor-icon.tsx's layout effect). The element that holds what the script
// changes needs suppressHydrationWarning.
export function InlineScript({ code }: { code: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
