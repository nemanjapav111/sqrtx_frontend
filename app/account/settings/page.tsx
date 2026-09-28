import Link from "next/link";
import LogoutButton from "@/app/components/logout-button";
import ArrowIcon from "@/app/register/arrow-icon";
import SettingsStep from "./settings-step";

export const metadata = { title: "Settings – sqrtx" };

// Account settings: change the login email and the password. The confirmation link Supabase emails for an email
// change brings the user back here. No design for this page as a whole (only the "Change login email" form has one,
// Figma 1005:97): it follows the registration pages, and the rest of its wording is placeholder.
export default function Settings() {
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <Link href="/account" aria-label="Back" className="absolute top-0.75 left-1.5 px-2.5 py-2 md:left-[calc(50%-260px)]">
        <ArrowIcon className="h-7 w-6 rotate-180" />
      </Link>
      <div className="absolute top-0.75 right-3 md:right-[calc(50%-262px)]">
        <LogoutButton />
      </div>
      <div className="flex w-full max-w-200 flex-col items-center">
        <SettingsStep />
      </div>
    </main>
  );
}
