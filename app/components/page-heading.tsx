// The title + "This information will be publicly visible." line at the top of every registration form page.
// Its own component so the page can show it right away, while the form itself is still loading or failed to load,
// instead of an empty page under the logo (see company-step.tsx / products-step.tsx).
// md: trims the mobile design's generous top/bottom padding on wider screens: these pages are phone-only designs
// (see PROJECT_NOTES), so at desktop width the padding was just unused whitespace pushing the page into a
// scrollbar it didn't need, not anything that matters to the design at that size.
export default function PageHeading({ title }: { title: string }) {
  return (
    <>
      <h1 className="pt-9.5 pb-2 text-[20px] font-semibold md:pt-6">{title}</h1>
      <p className="pb-10 font-semibold md:pb-6">This information will be publicly visible.</p>
    </>
  );
}
