import Link from "next/link";

// Breakpoints: phone = default, tablet = md: (768px), desktop = xl: (1280px).

// Gray square with no border. When checked, a black check mark (inline SVG) is drawn on it.
const checkbox =
  "size-5 appearance-none bg-[#d9d9d9] bg-center bg-no-repeat checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2020%2020%22%3E%3Cpath%20d=%22M4.5%2010.5l3.5%203.5L15.5%206%22%20fill=%22none%22%20stroke=%22black%22%20stroke-width=%222.5%22/%3E%3C/svg%3E')]";

// One heading + paragraph pair, used for every info section on the page.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="w-full max-w-200 pt-4 text-center">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="py-2 whitespace-pre-line">{children}</p>
    </section>
  );
}

// Register + Log in. Stacked on phone, side by side on tablet/desktop.
function Cta() {
  return (
    <div className="flex flex-col items-center gap-2.5 md:flex-row md:items-start md:gap-6.25">
      <div className="flex w-46.5 flex-col items-center gap-1.5">
        <Link href="/register" className="w-full bg-[#009a1c] py-2.75 text-center font-bold">
          Register
        </Link>
        <p className="text-center text-sm">
          <span className="font-semibold">30-day free trial.</span>
          <br />
          <span className="italic">No credit card required.</span>
        </p>
      </div>
      <Link
        href="/login"
        className="w-46.5 border-2 border-white py-2.25 text-center font-bold"
      >
        Log in
      </Link>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center bg-black text-white">
      {/* Logo bar */}
      <header className="sticky top-0 z-10 flex h-16.75 w-full items-center gap-1.25 bg-black px-4.75">
        <div className="size-5 bg-white" />
        <span className="-translate-y-px font-bold leading-none">sqrtx</span>
      </header>

      <div className="flex w-full max-w-277.75 flex-col items-center px-4 md:px-12.5">
        {/* Top area: headline + buttons (tablet/desktop only) and the hero.
            Stacked on phone/tablet, side by side on desktop. */}
        <div className="flex w-full flex-col items-center gap-6.25 pt-5 xl:flex-row xl:items-start xl:gap-2.5 xl:pt-12.5">
          <div className="hidden w-full flex-col items-center gap-9 md:flex xl:flex-1 xl:items-start">
            <h1 className="flex flex-col gap-5 text-center text-[32px] leading-[normal] font-bold uppercase xl:gap-12.75 xl:text-left xl:text-4xl">
              <span>Professional business platform.</span>
              <span>Easily create your website.</span>
              <span className="text-[#00cf37]">Let customers find you.</span>
            </h1>
            <Cta />
          </div>

          {/* Hero: big square, Enter button, "remember me" */}
          <div className="flex flex-col items-center gap-4.5 xl:px-2.5">
            <div className="size-62.5 bg-white" />
            <Link
              href="#"
              className="w-50 bg-white py-2.75 text-center font-bold text-black"
            >
              Enter
            </Link>
            <label className="flex items-center gap-3 self-start py-3 text-sm font-semibold">
              <input type="checkbox" className={checkbox} />
              Remember me as a visitor
            </label>
          </div>
        </div>

        {/* Info sections */}
        <Section title="What is sqrtx?">
          {`Sqrtx is a next-gen business platform that focuses on the core of your business.
Take full control of your online presence. Update your site whenever you want, showcase your products and services, and let visitors discover your business and connect with you directly—all in one place.`}
        </Section>
        <Section title="Our mission">
          Our mission is to encourage, showcase, and support honest work and genuine
          businesses.
        </Section>
        <Section title="Pricing">
          {`Visitors: Free
Businesses: 30-day free trial, then upgrade to $11.1/month or $111/year.`}
        </Section>
        <Section title="Contact">support@sqrtx.co</Section>

        {/* Buttons at the bottom on phone only (tablet/desktop show them at the top) */}
        <div className="py-4 md:hidden">
          <Cta />
        </div>

        <footer className="pt-10 pb-7.5 text-center">
          © 2026 sqrtx. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
