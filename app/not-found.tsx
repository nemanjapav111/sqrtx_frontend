import Link from "next/link";
import BigLogo from "@/app/components/big-logo";

export const metadata = { title: "Page not found – sqrtx" };

// Shown for any address that leads nowhere, including a business address that doesn't exist or isn't public (for
// example a business whose free trial ended). No design for it yet: the logo, one sentence and a link home.
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black">
      <BigLogo />
      <h1 className="pt-9.5 pb-2 text-[20px] font-semibold">Page not found</h1>
      <p className="px-5 pb-6 text-center">We couldn&apos;t find what you were looking for.</p>
      <Link href="/" className="flex h-11 items-center px-4 font-semibold underline">
        Go to sqrtx
      </Link>
    </main>
  );
}
