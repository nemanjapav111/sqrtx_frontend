import BackLink from "../back-link";
import ServicesList from "./services-list";

export const metadata = { title: "Your services – sqrtx" };

// The owner's services: a list leading to each service's edit page. No design: it follows the account pages.
export default function Services() {
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <BackLink href="/account" />
      <div className="flex w-full max-w-200 flex-col items-center">
        <ServicesList />
      </div>
    </main>
  );
}
