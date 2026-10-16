import type { Metadata } from "next";
import Link from "next/link";
import { asLocale } from "@/lib/i18n";
import { getDictionary } from "../../dictionaries";
import DotLogo from "./dot-logo";

export async function generateMetadata({ params }: PageProps<"/[lang]/about">): Promise<Metadata> {
  const { about } = (await getDictionary(asLocale((await params).lang))).home;
  return { title: about.metaTitle, description: about.metaDescription };
}

// sqrtx.co/about: about sqrtx itself (Figma "sqrtx About Phone/Tablet/Desktop new"): a column of text, at most 700px wide and centered. The
// shell (the black top bar, the bottom bar) is the layout above (../layout.tsx); the phone and tablet designs have no search line under the bar
// there (home/home-search.tsx). Phone: the text 328px wide, 50px under the bar; from 768px: 50px at each side, 111px above (and under) the text.
//
// THE TEXT (home.about.body in the dictionaries) IS A PLACEHOLDER written for this page: the design's own text is a copied example (about another
// site's awards), not about sqrtx. Replace it with the real text (an empty line starts a new paragraph), in both languages.
export default async function AboutSqrtx({ params }: PageProps<"/[lang]/about">) {
  const { home, registration } = await getDictionary(asLocale((await params).lang));
  const { about } = home;
  return (
    <main className="mx-auto flex w-full flex-col px-4 pt-12.5 pb-[111px] md:px-12.5 md:pt-[111px]">
      <div className="mx-auto w-full max-w-175">
        <DotLogo />
        <h1 className="sr-only">{about.heading}</h1>
        <p className="text-[16px] leading-5 whitespace-pre-line text-black wrap-break-word">{about.body}</p>
        {/* For the business owner who reads this page: the way into registration, apart from the text above (which is the owner's to rewrite). */}
        <section className="flex flex-col gap-1 pt-8">
          <h2 className="text-[16px] leading-5 font-bold">{about.ownerTitle}</h2>
          <p className="text-[16px] leading-5 text-[#636363]">{registration.final.free}</p>
          <Link href="/register" className="mt-3.5 flex h-11 w-full items-center justify-center bg-black px-8 text-[16px] font-bold text-white md:w-fit">
            {registration.final.create}
          </Link>
        </section>
      </div>
    </main>
  );
}
