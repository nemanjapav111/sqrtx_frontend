"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/app/[lang]/dictionaries/en";

// The language of the page, and the texts every screen's client components may need: the account menu and what screens share (error lines, the
// password eye, "Step 1"). Set once in the root layout. A screen's own texts are passed to it by its page instead, so they are not sent to every page.
const LangContext = createContext<{ lang: Locale; shell: Dictionary["shell"]; common: Dictionary["common"] } | null>(null);

export function LangProvider({
  lang,
  shell,
  common,
  children,
}: {
  lang: Locale;
  shell: Dictionary["shell"];
  common: Dictionary["common"];
  children: React.ReactNode;
}) {
  return <LangContext value={{ lang, shell, common }}>{children}</LangContext>;
}

function useLangContext() {
  const value = useContext(LangContext);
  if (!value) throw new Error("useLang outside the LangProvider");
  return value;
}

export const useLang = () => useLangContext().lang;
export const useShellText = () => useLangContext().shell;
export const useCommonText = () => useLangContext().common;
