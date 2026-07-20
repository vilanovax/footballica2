"use client";

import { useEffect } from "react";
import { useLanguageStore } from "@/stores/languageStore";
import { getDirection } from "@/lib/i18n/config";

/**
 * Syncs the persisted locale to the document: sets `lang` + `dir` on <html>
 * so Tailwind logical properties flip and the Persian font kicks in for RTL.
 * Pure side-effect wrapper — renders children untouched.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const locale = useLanguageStore((s) => s.locale);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = getDirection(locale);
  }, [locale]);

  return <>{children}</>;
}
