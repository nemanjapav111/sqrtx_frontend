import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asLocale, fill } from "@/lib/i18n";
import { getBusiness } from "@/lib/public-site";
import { getDictionary } from "../../dictionaries";

// sqrtx.co/<address>/about: the text the business wrote about itself when it registered (Figma "About Phone new", measured 2026-10-01;
// the owner says tablet and desktop are the same, in a column at most 700px wide). The layout next to this file draws the top and
// bottom bars and 404s a business that isn't public. Plain HTML made on the server.
//  - 50px under the bar, the text (Inter 16/20, black) in a centered column: the page's side gaps on a phone (328px of 360), 700px at most.
//  - The owner's line breaks and empty lines are kept (the design has three paragraphs). The design has no heading; one is there for
//    search engines and screen readers only.

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params;
  const business = await getBusiness(slug);
  if (!business) return {};
  return { title: fill((await getDictionary(asLocale(lang))).business.about.metaTitle, { name: business.company_name }) };
}

export default async function AboutPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const business = await getBusiness(slug);
  if (!business) notFound();
  const text = (await getDictionary(asLocale(lang))).business.about;

  const about = business.about_company?.trim();

  return (
    <main className="mx-auto flex w-full flex-col px-4 pt-12.5 pb-17.5 md:px-10 md:pb-25">
      <div className="mx-auto w-full max-w-87.5 md:max-w-175">
        <h1 className="sr-only">{fill(text.heading, { name: business.company_name })}</h1>
        {about ? (
          <p className="text-[16px] leading-5 whitespace-pre-line text-black wrap-break-word">{about}</p>
        ) : (
          <p className="text-center text-[16px] leading-5 text-[#888]">{text.empty}</p>
        )}
      </div>
    </main>
  );
}
