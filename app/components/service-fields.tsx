"use client";

import CategorySelect from "@/app/components/category-select";
import Field from "@/app/components/field";
import ImageZone from "@/app/components/image-zone";
import PriceTypePicker from "@/app/components/price-type-picker";
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
}: {
  values: ServiceValues;
  onChange: (update: (current: ServiceValues) => ServiceValues) => void;
  invalid: (field: ServiceField) => boolean;
  categories: string[];
}) {
  const set = (change: Partial<ServiceValues>) => onChange((v) => ({ ...v, ...change }));
  return (
    <>
      <Field
        label="Service name*"
        name="serviceName"
        type="text"
        maxLength={255}
        value={values.name}
        onChange={(v) => set({ name: v })}
        invalid={invalid("name")}
      />
      <div className="flex w-full flex-col gap-3.5">
        <Field
          label="Price"
          name="price"
          type="text"
          inputMode="decimal"
          prefix="$"
          maxLength={13}
          value={values.price}
          onChange={(v) => set({ price: v })}
          invalid={invalid("price")}
        />
        <PriceTypePicker value={values.priceType} onChange={(priceType) => set({ priceType })} price={values.price} />
      </div>
      <CategorySelect
        label="Category*"
        placeholder="Select or create a category"
        options={categories}
        allowCreate
        maxRows={5}
        smallPlaceholder
        value={values.category}
        invalid={invalid("category")}
        onChange={(v) => set({ category: v })}
      />
      <Field
        label="How long it takes"
        name="duration"
        type="text"
        hint={'Optional. For example "About 2 hours".'}
        maxLength={SERVICE_DURATION_MAX_LENGTH}
        value={values.duration}
        onChange={(v) => set({ duration: v })}
        invalid={false}
      />
      <Field
        label="Where you work"
        name="serviceArea"
        type="text"
        hint={'Optional. For example "Belgrade and 30 km around".'}
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
          Description*
        </label>
        <p id="service-description-hint" className="-mt-1 text-[13px] font-medium text-[#4b5563]">
          What is included, what the customer should prepare or know, and anything that costs extra.
        </p>
        <textarea
          id="service-description"
          name="description"
          aria-invalid={invalid("description")}
          aria-describedby="service-description-hint"
          value={values.description}
          onChange={(e) => set({ description: e.target.value })}
          className={`h-75 w-full resize-none border p-1 text-[16px] text-[#111] outline-none focus:shadow-[0_0_0_1px_black] ${
            invalid("description") ? "border-red-600 focus:shadow-[0_0_0_1px_#dc2626]" : "border-black"
          }`}
        />
      </div>
    </>
  );
}
