import Link from "next/link";

// The large logo at the top of the registration pages. Links back to the landing page.
export default function BigLogo() {
  return (
    <Link href="/" className="flex h-27.75 items-center justify-center gap-4.5">
      <div className="size-22.5 bg-black" />
      <span className="text-[75px] leading-[normal] font-bold">sqrtx</span>
    </Link>
  );
}
