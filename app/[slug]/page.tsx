import { notFound } from "next/navigation";
import { getBusiness, getProductsPage } from "@/lib/public-site";
import ProductList from "./product-list";

// sqrtx.co/<address>: the business's public site opens on whichever of products or services it actually lists (see
// tabs.ts's primaryTab; a business that lists both opens on Products, the more built-out of the two so far). The
// layout next to this file draws the top and bottom bars and 404s a business that isn't public. Products is a phone
// design (Figma 2063:8869, "Products Phone new") extended for tablet/desktop; there is no design at all yet for a
// Services page, so a services-only business gets a plain placeholder instead (see below) rather than the empty,
// mislabelled Products page ("No products yet.") this used to show it.
// Only the FIRST page of products is built here (and kept, see generateStaticParams in the layout); the list asks for the rest.
export default async function BusinessHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) notFound();

  if (business.provides === "services") {
    return (
      <main className="mx-auto flex w-full flex-col px-4 pb-2.5 md:px-7.5 md:pt-7.5">
        <p className="text-[14px] text-[#636363]">This business&apos;s services aren&apos;t listed here yet.</p>
      </main>
    );
  }

  const initial = await getProductsPage(business.user_id);
  return <ProductList initial={initial} userId={business.user_id} slug={slug.toLowerCase()} />;
}
