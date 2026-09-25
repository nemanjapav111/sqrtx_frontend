import Link from "next/link";
import ArrowIcon from "../arrow-icon";
import CompanyStep from "./company-step";

export const metadata = { title: "Public profile – sqrtx" };

// Registration step 1. This is also where the link in the confirmation email brings the user.
export default function Company() {
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black">
      {/* Back. TODO: goes to the landing page until we decide where Back from the first step should lead. */}
      <Link href="/" aria-label="Back" className="absolute top-1.75 left-3 p-1">
        <ArrowIcon className="h-7 w-6 rotate-180" />
      </Link>
      <div className="flex w-full max-w-200 flex-col items-center">
        <CompanyStep />
      </div>
    </main>
  );
}
