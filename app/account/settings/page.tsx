import LogoutButton from "@/app/components/logout-button";
import BackButton from "./back-button";
import SettingsStep from "./settings-step";

export const metadata = { title: "Settings – sqrtx" };

// Account settings: change the login email and the password. The confirmation link Supabase emails for an email
// change brings the user back here. No design for this page as a whole (only the "Change login email" form has one,
// Figma 1005:97): it follows the registration pages, and the rest of its wording is placeholder.
export default function Settings() {
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <BackButton />
      <div className="absolute top-0.75 right-3 md:right-[calc(50%-262px)]">
        <LogoutButton />
      </div>
      <div className="flex w-full max-w-200 flex-col items-center">
        <SettingsStep />
      </div>
    </main>
  );
}
