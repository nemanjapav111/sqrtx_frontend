import BackLink from "../../back-link";
import ProductEditStep from "../product-edit-step";

export const metadata = { title: "Add product – sqrtx" };

// Adds a product after registration: the same form as the edit page, empty. (A static folder, so /account/products/new
// is never taken for a product whose id is "new".)
export default function NewProduct() {
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <BackLink href="/account/products" />
      <div className="flex w-full max-w-200 flex-col items-center">
        <ProductEditStep id={null} />
      </div>
    </main>
  );
}
