"use client";

import CategorySelect from "@/app/components/category-select";
import Field from "@/app/components/field";
import ImageZone from "@/app/components/image-zone";
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
}: {
  values: ProductValues;
  onChange: (update: (current: ProductValues) => ProductValues) => void;
  invalid: (field: ProductField) => boolean;
  categories: string[];
}) {
  const set = (change: Partial<ProductValues>) => onChange((v) => ({ ...v, ...change }));
  return (
    <>
      <Field
        label="Product name*"
        name="productName"
        type="text"
        maxLength={255}
        value={values.name}
        onChange={(v) => set({ name: v })}
        invalid={invalid("name")}
      />
      <Field
        label="Price"
        name="price"
        type="text"
        inputMode="decimal"
        prefix="$"
        hint={'Displays "Inquiry" if left blank.'}
        maxLength={13}
        value={values.price}
        onChange={(v) => set({ price: v })}
        invalid={invalid("price")}
      />
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
      <ImageZone
        images={values.images}
        invalid={invalid("images")}
        onChange={(update) => onChange((v) => ({ ...v, images: update(v.images) }))}
        maxImages={MAX_PRODUCT_IMAGES}
        itemLabel="product"
      />
      <div className="flex w-full flex-col gap-2.25">
        <label htmlFor="product-description" className="text-[14px] font-semibold">
          Description*
        </label>
        <textarea
          id="product-description"
          name="description"
          aria-invalid={invalid("description")}
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
