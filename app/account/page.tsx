import AccountStep from "./account-step";

export const metadata = { title: "Account – sqrtx" };

// The account page: the login, whether the business page is public, and billing (free trial, plans, subscription).
// This is where a user lands after finishing registration and after logging in, and where the payment provider brings
// them back to after checkout (?checkout=success or ?checkout=cancelled). No design for this page yet: it follows the
// registration pages (same logo, widths and paddings), and all its wording is placeholder.
export default async function Account({ searchParams }: { searchParams: Promise<{ checkout?: string | string[] }> }) {
  const { checkout } = await searchParams;
  const returned = checkout === "success" || checkout === "cancelled" ? checkout : null;

  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <div className="flex w-full max-w-200 flex-col items-center">
        <AccountStep returned={returned} />
      </div>
    </main>
  );
}
