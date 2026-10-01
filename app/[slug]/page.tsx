import { notFound } from "next/navigation";
import { getBusiness, getProductsPage, getServicesPage } from "@/lib/public-site";
import ProductList from "./product-list";
import ServiceList from "./service-list";

// sqrtx.co/<address>: the business's public site opens on whichever of products or services it actually lists (see
// tabs.ts's primaryTab; a business that lists both opens on Products, the more built-out of the two so far). The
// layout next to this file draws the top and bottom bars and 404s a business that isn't public. Products is a phone
// design (Figma 2063:8869, "Products Phone new") extended for tablet/desktop. A services-only business opens on its Services
// page (services/page.tsx is the same page at /services for a business that lists both).
// Only the FIRST page of products is built here (and kept, see generateStaticParams in the layout); the list asks for the rest.
export default async function BusinessHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) notFound();

  if (business.provides === "services") {
    const services = await getServicesPage(business.user_id);
    return <ServiceList initial={services} userId={business.user_id} slug={slug.toLowerCase()} />;
  }

  const initial = await getProductsPage(business.user_id);
  return <ProductList initial={initial} userId={business.user_id} slug={slug.toLowerCase()} />;
}
