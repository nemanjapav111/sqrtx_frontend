"use client";

import CategorySelect from "@/app/[lang]/components/category-select";
import Field from "@/app/[lang]/components/field";
import { useCommonText } from "@/app/[lang]/components/lang-context";
import ImageZone from "@/app/[lang]/components/image-zone";
import PriceTypePicker from "@/app/[lang]/components/price-type-picker";
import { currencySymbol } from "@/lib/price";
import { MAX_SERVICE_IMAGES, SERVICE_AREA_MAX_LENGTH, SERVICE_DURATION_MAX_LENGTH, type ServiceField, type ServiceValues } from "@/lib/services";

// The form control that gets the cursor for each field that needs fixing.
export const CONTROL_NAME: Record<ServiceField, string> = {
  name: "serviceName",
  price: "price",
  category: "category",
  images: "images",
  description: "description",
};

// The fields of a service, from top to bottom: the same on the registration page (adding) and the owner's edit page.
// Everything they do with the values is decided by the page that uses them.
// A service sells on a few facts, so besides the price (and what it means) and the description there are two short optional ones, how long it
// takes and where the business works, and the description says what to write in it (what is included, what to prepare, what costs extra).
export default function ServiceFields({
  values,
  onChange,
  invalid,
  categories,
  currency,
}: {
  values: ServiceValues;
  onChange: (update: (current: ServiceValues) => ServiceValues) => void;
  invalid: (field: ServiceField) => boolean;
  categories: string[];
  currency: string; // the business's currency: its symbol starts the price box
}) {
  const t = useCommonText().serviceFields;
  const set = (change: Partial<ServiceValues>) => onChange((v) => ({ ...v, ...change }));
  return (
    <>
      <Field
        label={t.name}
        name="serviceName"
        type="text"
        maxLength={255}
        value={values.name}
        onChange={(v) => set({ name: v })}
        invalid={invalid("name")}
      />
      <div className="flex w-full flex-col gap-3.5">
        <Field
          label={t.price}
          name="price"
          type="text"
          inputMode="decimal"
          prefix={currencySymbol(currency)}
          maxLength={13}
          value={values.price}
          onChange={(v) => set({ price: v })}
          invalid={invalid("price")}
        />
        <PriceTypePicker value={values.priceType} onChange={(priceType) => set({ priceType })} price={values.price} currency={currency} />
      </div>
      <CategorySelect
        label={t.category}
        placeholder={t.categoryPlaceholder}
        options={categories}
        allowCreate
        maxRows={5}
        smallPlaceholder
        value={values.category}
        invalid={invalid("category")}
        onChange={(v) => set({ category: v })}
      />
      <Field
        label={t.duration}
        name="duration"
        type="text"
        placeholder={t.durationPlaceholder}
        maxLength={SERVICE_DURATION_MAX_LENGTH}
        value={values.duration}
        onChange={(v) => set({ duration: v })}
        invalid={false}
      />
      <Field
        label={t.area}
        name="serviceArea"
        type="text"
        placeholder={t.areaPlaceholder}
        maxLength={SERVICE_AREA_MAX_LENGTH}
        value={values.serviceArea}
        onChange={(v) => set({ serviceArea: v })}
        invalid={false}
      />
      <ImageZone
        images={values.images}
        invalid={invalid("images")}
        onChange={(update) => onChange((v) => ({ ...v, images: update(v.images) }))}
        maxImages={MAX_SERVICE_IMAGES}
        itemLabel="service"
      />
      <div className="flex w-full flex-col gap-2.25">
        <label htmlFor="service-description" className="text-[14px] font-semibold">
          {t.description}
        </label>
        <textarea
          id="service-description"
          name="description"
          aria-invalid={invalid("description")}
          placeholder={t.descriptionPlaceholder}
          value={values.description}
          onChange={(e) => set({ description: e.target.value })}
          className={`field-sizing-content min-h-45 w-full resize-none border p-2 text-[16px] text-[#111] outline-none placeholder:text-[#8f8f8f] focus:shadow-[0_0_0_1px_black] ${
            invalid("description") ? "border-red-600 focus:shadow-[0_0_0_1px_#dc2626]" : "border-black"
          }`}
        />
      </div>
    </>
  );
}
