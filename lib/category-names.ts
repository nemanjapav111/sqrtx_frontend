// Business categories' names in the language of the page. The list itself lives in the API (GET /business-profile/categories): an `id` never changes, so a
// translated name is found by it; the English name is kept next to it because some answers (the marketplace's companies) carry only the name. A category that
// is not in the table (a new one the API added) simply shows the API's own English name until a line is added to the language's file in lib/category-tables/.
// The table itself is loaded by the page (lib/category-tables/index.ts), so this file holds no names: only what turns a table into names.

/** One language's names. Each category row: [id, English name as in the API, name in the language]. Groups are by their English name in the API. */
export interface CategoryTable {
  categories: readonly (readonly [id: string, english: string, translated: string])[];
  groups: Record<string, string>;
}

export interface CategoryNamer {
  /** A category's name from its id (`apiName` is what the API called it, shown when there is no translation). */
  name: (id: string, apiName: string) => string;
  /** The same from the English name alone (an answer that carries no id, like the marketplace's companies list). */
  nameOf: (englishName: string) => string;
  /** A group heading of the category box. */
  group: (group: string) => string;
}

const AS_IS: CategoryNamer = { name: (_id, apiName) => apiName, nameOf: (englishName) => englishName, group: (group) => group };

/** The names for a language's table (`null`: English, the API's own names). */
export function categoryNamer(table: CategoryTable | null): CategoryNamer {
  if (!table) return AS_IS;
  const byId = new Map(table.categories.map(([id, , translated]) => [id, translated]));
  const byEnglish = new Map(table.categories.map(([, english, translated]) => [english, translated]));
  return {
    name: (id, apiName) => byId.get(id) ?? apiName,
    nameOf: (englishName) => byEnglish.get(englishName) ?? englishName,
    group: (group) => table.groups[group] ?? group,
  };
}
