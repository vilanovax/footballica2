import type { Dictionary } from "./locales/en";

export type Locale = "en" | "fa";
export type Direction = "ltr" | "rtl";

export const LOCALES: Locale[] = ["en", "fa"];
export const DEFAULT_LOCALE: Locale = "en";

// Text direction per locale (Arabic will also be "rtl" when added).
export const DIRECTION: Record<Locale, Direction> = { en: "ltr", fa: "rtl" };

export function getDirection(locale: Locale): Direction {
  return DIRECTION[locale] ?? "ltr";
}

export type { Dictionary };
