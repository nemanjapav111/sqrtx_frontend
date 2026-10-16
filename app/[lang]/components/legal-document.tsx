import Link from "next/link";
import BigLogo from "@/app/[lang]/components/big-logo";
import { LEGAL } from "@/lib/legal";

// The page shell shared by /terms and /privacy: the big logo, the title, the version and date, a notice that the text is
// still a draft, the sections, and a link to the other document. No design for these pages yet, so the look is simple
// and follows the registration pages (same widths and paddings).
export default function LegalDocument({
  title,
  version,
  other,
  children,
}: {
  title: string;
  version: string;
  other: { href: string; label: string } | { href: string; label: string }[]; // the other documents
  children: React.ReactNode;
}) {
  const others = Array.isArray(other) ? other : [other];
  return (
    <main className="flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <div className="flex w-full max-w-200 flex-col items-center">
        <BigLogo />
        <article className="w-full max-w-135 px-5 pt-9.5 md:pt-6">
          <h1 className="text-[20px] font-semibold">{title}</h1>
          <p className="pt-1 text-[14px] text-[#4b5563]">
            Version {version} · Last updated {LEGAL.updated}
          </p>
          {/* TODO: remove this notice when a lawyer has reviewed the text and the [brackets] are filled in. */}
          <p role="note" className="mt-5 border border-black p-3 text-[14px] font-semibold">
            Draft. This text has not been reviewed by a lawyer yet, and the parts in [square brackets] are still to be filled in.
          </p>
          <div className="flex flex-col gap-6 pt-6 pb-10 text-[14px] leading-6">{children}</div>
          <div className="flex flex-wrap gap-x-5">
            {others.map((link) => (
              <Link key={link.href} href={link.href} className="inline-block py-3 text-[14px] font-semibold underline">
                {link.label}
              </Link>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}

// One numbered part of a document.
export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[16px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

// A bulleted list inside a section.
export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1 pl-5">{children}</ul>;
}
