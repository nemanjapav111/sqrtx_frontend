"use client";

import { useRouter } from "next/navigation";
import ArrowIcon from "@/app/register/arrow-icon";

// Unlike the registration pages' back arrows (a fixed link to the previous step of a linear wizard, so a hardcoded
// href is always right), this page can be reached from more than one place: from /account, or straight from the
// account dropdown of a signed-in user browsing their OWN public page (visitor-icon.tsx's "Settings" row). A
// hardcoded link back to /account sent that second case to the wrong place, so this goes back to wherever the user
// actually came from instead, the same way the browser's own back button would.
export default function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Back"
      className="absolute top-0.75 left-1.5 cursor-pointer px-2.5 py-2 md:left-[calc(50%-260px)]"
    >
      <ArrowIcon className="h-7 w-6 rotate-180" />
    </button>
  );
}
