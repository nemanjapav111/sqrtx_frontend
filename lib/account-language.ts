import { apiFetch, jsonBody } from "@/lib/api";
import type { Locale } from "@/lib/i18n";

// Saves the language the signed-in user chose on their account (PATCH /account/language), so it follows them to another device or browser.
export const setAccountLanguage = (language: Locale) => apiFetch<{ language: Locale }>("/account/language", jsonBody("PATCH", { language }));
