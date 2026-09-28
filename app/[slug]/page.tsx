import { notFound } from "next/navigation";
import { getBusiness, getProducts } from "@/lib/public-site";
import ProductList from "./product-list";

// sqrtx.co/<address>: the business's public site opens on its products (Figma 2063:8869, "Products Phone new"). The
// layout next to this file draws the top and bottom bars and 404s a business that isn't public. This is a phone design,
// there is no tablet or desktop version yet: on a wide screen it stays one narrow column in the middle.
// The Products page is shown even when the business only offers services: it just has no products (the Services page
// does not exist yet, so there is nowhere better to send visitors).
export default async function BusinessProducts({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) notFound();
  const products = await getProducts(business.user_id);

  return <ProductList products={products} />;
}
