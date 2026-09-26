import Link from "next/link";

// The large logo at the top of the registration pages. Links back to the landing page.
export default function BigLogo() {
  return (
    <Link href="/" className="flex h-27.75 items-center justify-center gap-4.5">
      <div className="size-22.5 bg-black" />
      {/* Inter's line box has more room below the letters than above, so the word sits low next to the
          square. Lifting it by the same proportion as the small logo on the landing page (1px at 16px)
          puts the letters level with the square's middle. */}
      <span className="-translate-y-1.25 text-[75px] leading-[normal] font-bold">sqrtx</span>
    </Link>
  );
}
