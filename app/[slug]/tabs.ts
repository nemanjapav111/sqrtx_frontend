// The pages of a business's public site, shared by the bottom bar (phone) and the links in the top bar (tablet and
// desktop). Only Products exists so far: Services, Contact and About have no design and no route yet, so their links
// lead to a 404 for now.
export type TabKey = "products" | "services" | "contact" | "about";

type Provides = "products" | "services" | "both";

const LABELS: Record<TabKey, string> = {
  products: "Products",
  services: "Services",
  contact: "Contact",
  about: "About",
};

const ORDER: TabKey[] = ["products", "services", "contact", "about"];

/**
 * Which tab lives at the business's own address, with no suffix: whichever of products or services it actually
 * lists, so a services-only business does not open on an empty, mislabelled Products page (see page.tsx). "both"
 * keeps Products there, since it is the more built-out of the two so far.
 */
export function primaryTab(provides: Provides): TabKey {
  return provides === "services" ? "services" : "products";
}

/** All four tabs in order, each with the address it lives at relative to the business's own address (blank for the
 * primary tab, "/services" etc. for the rest). */
export function tabsFor(provides: Provides): { key: TabKey; label: string; path: string }[] {
  const primary = primaryTab(provides);
  return ORDER.map((key) => ({ key, label: LABELS[key], path: key === primary ? "" : `/${key}` }));
}

/** The page you are on, from the address: the primary tab is the business address itself, the others are their own paths. */
export function currentTab(pathname: string, slug: string, provides: Provides): TabKey {
  const base = `/${slug.toLowerCase()}`;
  const path = pathname.toLowerCase();
  const tabs = tabsFor(provides);
  return tabs.find((tab) => tab.path !== "" && path.startsWith(base + tab.path))?.key ?? primaryTab(provides);
}
