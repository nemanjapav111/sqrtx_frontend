import type { Metadata } from "next";
import "./globals.css";
import { inter } from './fonts';
import { InlineScript } from "./components/inline-script";

// Measures the width of a scrollbar (0 where scrollbars float over the page) into --sbw, see keep-width in globals.css. It runs before
// the first paint, and again when the window is resized (browser zoom changes a scrollbar's width in CSS pixels).
const MEASURE_SCROLLBAR = `(function(){var d=document,r=d.documentElement;function m(){var e=d.createElement("div");e.style.cssText="position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll";d.body.appendChild(e);var w=e.offsetWidth-e.clientWidth;d.body.removeChild(e);r.style.setProperty("--sbw",w+"px")}m();addEventListener("resize",m)})()`;

export const metadata: Metadata = {
  title: "sqrtx",
  description: "next-gen business platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the script above puts --sbw on this element before React starts.
    <html
      lang="en"
      className={`h-full antialiased`}
      suppressHydrationWarning
    >
      <body className={`${inter.className} min-h-full flex flex-col`}>
        <InlineScript code={MEASURE_SCROLLBAR} />
        {children}
      </body>
    </html>
  );
}
