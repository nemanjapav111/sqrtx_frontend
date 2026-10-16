import "server-only";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "./dictionaries/en";

// The texts for a language, loaded on the server only: a page passes its client components just the part they need.
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en").then((module) => module.en),
  sr: () => import("./dictionaries/sr").then((module) => module.sr),
};

export const getDictionary = (lang: Locale) => dictionaries[lang]();
