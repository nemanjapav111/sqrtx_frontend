import BackLink from "../../back-link";
import ProductEditStep from "../product-edit-step";

export const metadata = { title: "Edit product – sqrtx" };

// Edits one of the owner's products: the registration page's fields, filled with what is saved.
// The page is the same empty frame for every product (the product itself is loaded in the browser), so it is built once
// and kept, instead of on every visit: an empty list means no id is built ahead, each is kept on its first visit.
export function generateStaticParams() {
  return [];
}

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <BackLink href="/account/products" />
      <div className="flex w-full max-w-200 flex-col items-center">
        <ProductEditStep id={id} />
      </div>
    </main>
  );
}
