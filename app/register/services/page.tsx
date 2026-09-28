import ServicesStep from "./services-step";

export const metadata = { title: "Add service – sqrtx" };

// Registration step (only for businesses that offer services). Back goes to whichever step precedes it for this
// user: /register/products if they have one, otherwise /register/company (see ServicesStep).
export default function Services() {
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <div className="flex w-full max-w-200 flex-col items-center">
        <ServicesStep />
      </div>
    </main>
  );
}
