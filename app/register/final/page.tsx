import FinalStep from "./final-step";

export const metadata = { title: "About your company – sqrtx" };

// The last registration step (Figma node 1911:712). Back goes to whichever step precedes it for this user
// (company, products or services, depending on what the business offers) - see FinalStep.
// pt-17.5 matches the other registration pages (not this frame's own Figma padding, which is a symmetric 50px):
// keeping the logo at the same vertical position across every registration page matters more than matching
// this one frame's own number exactly.
export default function Final() {
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <div className="flex w-full max-w-200 flex-col items-center">
        <FinalStep />
      </div>
    </main>
  );
}
