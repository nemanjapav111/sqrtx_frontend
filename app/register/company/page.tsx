import LogoutButton from "@/app/components/logout-button";
import CompanyStep from "./company-step";

export const metadata = { title: "Public profile – sqrtx" };

// Registration step 1. This is also where the link in the confirmation email brings the user.
// No Back arrow: nothing comes before this step (the account is already made and the email confirmed), and the
// logo above the form already links to the landing page.
export default function Company() {
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <div className="absolute top-0.75 right-3 md:right-[calc(50%-262px)]">
        <LogoutButton />
      </div>
      <div className="flex w-full max-w-200 flex-col items-center">
        <CompanyStep />
      </div>
    </main>
  );
}
