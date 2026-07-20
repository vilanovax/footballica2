import type { Locale } from "./config";

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

/**
 * Localize ASCII digits in a string/number. For Persian we swap 0-9 → ۰-۹ so
 * scores, costs and timers read natively; other locales pass through unchanged.
 * Works on any pre-formatted string (e.g. "03:45", "3/3", "180").
 */
export function toLocaleDigits(value: string | number, locale: Locale): string {
  const str = String(value);
  if (locale !== "fa") return str;
  return str.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** Number with locale grouping separators AND localized digits (e.g. 1,250 → ۱٬۲۵۰). */
export function formatNumber(value: number, locale: Locale): string {
  return value.toLocaleString(locale === "fa" ? "fa-IR" : "en-US");
}
