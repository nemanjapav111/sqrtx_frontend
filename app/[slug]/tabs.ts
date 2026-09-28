// The pages of a business's public site, shared by the bottom bar (phone) and the links in the top bar (tablet and desktop).
// Only Products exists so far: the Services, Contact and About pages have no design and no route yet.
export const TABS = [
  { key: "products", label: "Products", path: "" },
  { key: "services", label: "Services", path: "/services" },
  { key: "contact", label: "Contact", path: "/contact" },
  { key: "about", label: "About", path: "/about" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

/** The page you are on, from the address: the business address itself is Products, the others are their own paths. */
export function currentTab(pathname: string, slug: string): TabKey {
  const base = `/${slug.toLowerCase()}`;
  const path = pathname.toLowerCase();
  return TABS.find((tab) => tab.path !== "" && path.startsWith(base + tab.path))?.key ?? "products";
}
