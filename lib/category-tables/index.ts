import type { Locale } from "@/lib/i18n";
import type { CategoryTable } from "@/lib/category-names";

// The category names of one language, loaded where a page is made (server code) and handed to the components that list categories as a prop: so a visitor
// only receives the names of their own language, however many languages the site has. English has no table: the API's own names are English.
// A new language adds a file next to this one (see sr.ts) and a line here.
const TABLES: Partial<Record<Locale, () => Promise<{ default: CategoryTable }>>> = {
  sr: () => import("./sr"),
};

export async function loadCategoryTable(lang: Locale): Promise<CategoryTable | null> {
  return (await TABLES[lang]?.())?.default ?? null;
}
