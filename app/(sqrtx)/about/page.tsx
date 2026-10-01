import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About – sqrtx",
  description: "What sqrtx is.",
};

// sqrtx.co/about: about sqrtx itself (Figma "sqrtx About Phone/Tablet/Desktop new"): a column of text, at most 700px wide and centered. The
// shell (the black top bar, the bottom bar) is the layout above (../layout.tsx); the phone and tablet designs have no search line under the bar
// there (home/home-search.tsx). Phone: the text 328px wide, 50px under the bar; from 768px: 50px at each side, 111px above (and under) the text.
//
// THE TEXT BELOW IS A PLACEHOLDER written for this page: the design's own text is a copied example (about another site's awards), not
// about sqrtx. Replace it with the real text (an empty line starts a new paragraph).
const ABOUT = `sqrtx is a place where businesses show what they offer and where people find them. Every business gets its own page at sqrtx.co/<its name>, with its products and services, its contact details and a way to write to it.

Here you can look through the newest products and services of all of them, filter by kind of business and by country, and visit a business's own page.

Who is behind it? A small team that wants good local businesses to be easy to find. Write to a business from its Contact page, or tell us what would make sqrtx more useful to you.`;

export default function AboutSqrtx() {
  return (
    <main className="mx-auto flex w-full flex-col px-4 pt-12.5 pb-[111px] md:px-12.5 md:pt-[111px]">
      <div className="mx-auto w-full max-w-175">
        <h1 className="sr-only">About sqrtx</h1>
        <p className="text-[16px] leading-5 whitespace-pre-line text-black wrap-break-word">{ABOUT}</p>
      </div>
    </main>
  );
}
