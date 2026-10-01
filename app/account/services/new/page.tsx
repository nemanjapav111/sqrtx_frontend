import BackLink from "../../back-link";
import ServiceEditStep from "../service-edit-step";

export const metadata = { title: "Add service – sqrtx" };

// Adds a service after registration: the same form as the edit page, empty. (A static folder, so /account/services/new
// is never taken for a service whose id is "new".)
export default function NewService() {
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <BackLink href="/account/services" />
      <div className="flex w-full max-w-200 flex-col items-center">
        <ServiceEditStep id={null} />
      </div>
    </main>
  );
}
