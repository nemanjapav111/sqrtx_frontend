import type { Metadata } from "next";
import "./globals.css";
import { inter } from './fonts';
import { InlineScript } from "./components/inline-script";
import PathTracker from "./[slug]/path-tracker";
import { notFound } from "next/navigation";
import { LOCALES, hasLocale } from "@/lib/i18n";
import { getDictionary } from "./dictionaries";
import { LangProvider } from "./components/lang-context";
import BackToTop from "./components/back-to-top";

// Measures the width of a scrollbar (0 where scrollbars float over the page) into --sbw, see keep-width in globals.css. It runs before
// the first paint, and again when the window is resized (browser zoom changes a scrollbar's width in CSS pixels).
const MEASURE_SCROLLBAR = `(function(){var d=document,r=d.documentElement;function m(){var e=d.createElement("div");e.style.cssText="position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll";d.body.appendChild(e);var w=e.offsetWidth-e.clientWidth;d.body.removeChild(e);r.style.setProperty("--sbw",w+"px")}m();addEventListener("resize",m)})()`;

export const metadata: Metadata = {
  title: "sqrtx",
  description: "next-gen business platform",
};

// One copy of every page per language (the address does not say which, except on a business's pages in another language: proxy.ts).
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { shell, common } = await getDictionary(lang);
  return (
    // suppressHydrationWarning: the script above puts --sbw on this element before React starts.
    <html
      lang={lang}
      className={`h-full antialiased`}
      suppressHydrationWarning
    >
      <body className={`${inter.className} min-h-full flex flex-col`}>
        <InlineScript code={MEASURE_SCROLLBAR} />
        {/* In the root layout so it sees EVERY page (the account page too): "← sqrtx" must know the page before the business. */}
        <PathTracker />
        <LangProvider lang={lang} shell={shell} common={common}>
          {children}
          <BackToTop />
        </LangProvider>
      </body>
    </html>
  );
}
