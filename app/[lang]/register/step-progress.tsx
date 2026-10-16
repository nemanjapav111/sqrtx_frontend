"use client";

import { useCommonText } from "@/app/[lang]/components/lang-context";
import { fill } from "@/lib/i18n";

// "Step 1" with a row of bars under it, the first one black: where the visitor is in the registration. The total is not said: there are always 4 steps
// (security, business profile, products and services, last step). A business that offers both products and services adds the two on separate pages that
// are both "Step 3", so the row never changes length.
export default function StepProgress({ current }: { current: number }) {
  const common = useCommonText();
  return (
    <div className="flex flex-col items-center gap-2 pt-7">
      <p className="text-[14px] font-medium text-[#737373]">{fill(common.step, { n: current })}</p>
      <div aria-hidden className="flex gap-1.5">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={`h-0.75 w-7 ${n <= current ? "bg-black" : "bg-[#e5e7eb]"}`} />
        ))}
      </div>
    </div>
  );
}
