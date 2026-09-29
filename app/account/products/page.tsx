import BackLink from "../back-link";
import ProductsList from "./products-list";

export const metadata = { title: "Your products – sqrtx" };

// The owner's products: a list leading to each product's edit page. No design: it follows the account pages.
export default function Products() {
  return (
    <main className="relative flex flex-1 flex-col items-center bg-white pt-17.5 pb-12.5 leading-[normal] text-black md:pb-8">
      <BackLink href="/account" />
      <div className="flex w-full max-w-200 flex-col items-center">
        <ProductsList />
      </div>
    </main>
  );
}
