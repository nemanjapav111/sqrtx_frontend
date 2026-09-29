import ArrowIcon from "@/app/register/arrow-icon";

// The "← sqrtx" label of the way back to sqrtx (top bar and bottom bar). The ← character is not in the Inter files Google
// serves, so the browser drew it in whatever font it had, thicker and a different shape from the site's own arrows. This is
// the same arrow the registration pages use (ArrowIcon, the "Back" and "Skip for now" arrows), turned round and drawn with
// a thinner line so it stays light next to 14px text. Not read from the Figma design (its limit was reached): only made
// to match the arrows the designs already gave the site.
export default function BackToSqrtx() {
  return (
    <span className="inline-flex items-center gap-1.5">
      {/* translate-y: centred in the line box the arrow sits about 1.5px ABOVE the middle of the lowercase letters (the line
          box is centred on the full text height, the letters' middle is lower): measured against the "s" in the browser. */}
      <ArrowIcon className="h-2.75 w-3.25 translate-y-[1.5px] rotate-180" strokeWidth={1.4} />
      sqrtx
    </span>
  );
}
