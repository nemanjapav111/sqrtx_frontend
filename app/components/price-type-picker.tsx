"use client";

import { SERVICE_PRICE_TYPES, formatServicePrice, type ServicePriceType } from "@/lib/price";

// What a service's price means, under the price field: four buttons (only one is on) and a line saying how the price will be shown, so the
// owner sees the result as they choose. `price` is the text typed in the field.
export default function PriceTypePicker({
  value,
  onChange,
  price,
}: {
  value: ServicePriceType;
  onChange: (value: ServicePriceType) => void;
  price: string;
}) {
  const typed = price.trim().replace(",", ".");
  return (
    <div className="flex flex-col gap-2.25">
      <div role="radiogroup" aria-label="What the price means" className="flex flex-wrap gap-2">
        {SERVICE_PRICE_TYPES.map((type) => {
          const on = type.value === value;
          return (
            <button
              key={type.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(type.value)}
              className={`flex h-9 cursor-pointer items-center justify-center border px-4 text-[14px] font-semibold ${
                on ? "border-black bg-black text-white" : "border-[#b8b8b8] bg-white text-black"
              }`}
            >
              {type.label}
            </button>
          );
        })}
      </div>
      <p className="text-[13px] font-medium text-[#4b5563]">
        Shown as: <span className="text-black">{formatServicePrice(typed === "" ? null : typed, value)}</span>
      </p>
    </div>
  );
}
