import CompanyStep from "@/app/register/company/company-step";
import BackLink from "../back-link";

export const metadata = { title: "Business profile – sqrtx" };

// The owner editing their business profile after registration: the registration's first page (same fields, checks and
// address search), filled with what is saved. No design of its own: only the title and the button differ.
export default function Profile() {
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <BackLink href="/account" />
      <div className="flex w-full max-w-200 flex-col items-center">
        <CompanyStep variant="account" />
      </div>
    </main>
  );
}
