import { Suspense } from "react";
import BigLogo from "@/app/components/big-logo";
import AccountStep from "./account-step";

export const metadata = { title: "Account – sqrtx" };

// The account page: the login, whether the business page is public, and billing (free trial, plans, subscription).
// This is where a user lands after finishing registration and after logging in, and where the payment provider brings
// them back to after checkout (?checkout=success or ?checkout=cancelled). No design for this page yet: it follows the
// registration pages (same logo, widths and paddings), and all its wording is placeholder.
// The page itself is static (built once, no server work per visit): everything on it is loaded in the browser, including the
// ?checkout= value, which AccountStep reads there. Reading it on the server made the page dynamic, rebuilt for every visit.
// The Suspense is what a static page needs around something that reads the address in the browser; its fallback is the
// logo and title AccountStep draws first anyway, so the page doesn't change shape when it takes over.
export default function Account() {
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <div className="flex w-full max-w-200 flex-col items-center">
        <Suspense
          fallback={
            <>
              <BigLogo />
              <h1 className="pt-9.5 pb-10 text-[20px] font-semibold md:pt-6 md:pb-6">Account</h1>
            </>
          }
        >
          <AccountStep />
        </Suspense>
      </div>
    </main>
  );
}
