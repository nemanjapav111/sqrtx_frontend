"use client";

import CategorySelect from "@/app/[lang]/components/category-select";
import Field from "@/app/[lang]/components/field";
import { useCommonText } from "@/app/[lang]/components/lang-context";
import ImageZone from "@/app/[lang]/components/image-zone";
import { currencySymbol } from "@/lib/price";
import { MAX_PRODUCT_IMAGES, type ProductField, type ProductValues } from "@/lib/products";

// The form control that gets the cursor for each field that needs fixing.
export const CONTROL_NAME: Record<ProductField, string> = {
  name: "productName",
  price: "price",
  category: "category",
  images: "images",
  description: "description",
};

// The fields of a product, from top to bottom: the same on the registration page (adding) and the owner's edit page.
// Everything they do with the values is decided by the page that uses them.
export default function ProductFields({
  values,
  onChange,
  invalid,
  categories,
  currency,
}: {
  values: ProductValues;
  onChange: (update: (current: ProductValues) => ProductValues) => void;
  invalid: (field: ProductField) => boolean;
  categories: string[];
  currency: string; // the business's currency: its symbol starts the price box
}) {
  const t = useCommonText().productFields;
  const set = (change: Partial<ProductValues>) => onChange((v) => ({ ...v, ...change }));
  return (
    <>
      <Field
        label={t.name}
        name="productName"
        type="text"
        maxLength={255}
        value={values.name}
        onChange={(v) => set({ name: v })}
        invalid={invalid("name")}
      />
      <Field
        label={t.price}
        name="price"
        type="text"
        inputMode="decimal"
        prefix={currencySymbol(currency)}
        hint={t.priceHint}
        maxLength={13}
        value={values.price}
        onChange={(v) => set({ price: v })}
        invalid={invalid("price")}
      />
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
      <ImageZone
        images={values.images}
        invalid={invalid("images")}
        onChange={(update) => onChange((v) => ({ ...v, images: update(v.images) }))}
        maxImages={MAX_PRODUCT_IMAGES}
        itemLabel="product"
      />
      <div className="flex w-full flex-col gap-2.25">
        <label htmlFor="product-description" className="text-[14px] font-semibold">
          {t.description}
        </label>
        <textarea
          id="product-description"
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
