// The title + "This information will be publicly visible." line at the top of every registration form page.
// Its own component so the page can show it right away, while the form itself is still loading or failed to load,
// instead of an empty page under the logo (see company-step.tsx / products-step.tsx).
export default function PageHeading({ title }: { title: string }) {
  return (
    <>
      <h1 className="pt-9.5 pb-2 text-[20px] font-semibold">{title}</h1>
      <p className="pb-10 font-semibold">This information will be publicly visible.</p>
    </>
  );
}
