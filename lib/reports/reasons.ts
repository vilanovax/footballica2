/**
 * Canonical question-report reasons. The stored `reason` is a locale-independent
 * CODE (e.g. "WRONG_ANSWER"); the game renders it via i18n (`report.reasons.*`)
 * and the admin renders the stable English label below. Keep in sync with the
 * `report.reasons` keys in the i18n dictionaries.
 */
export const REPORT_REASONS = [
  { code: "WRONG_ANSWER", labelEn: "Wrong answer" },
  { code: "TYPO", labelEn: "Typo or grammar" },
  { code: "BAD_IMAGE", labelEn: "Broken image" },
  { code: "OTHER", labelEn: "Something else" },
] as const;

export type ReportReasonCode = (typeof REPORT_REASONS)[number]["code"];

export const REPORT_REASON_CODES: readonly string[] = REPORT_REASONS.map(
  (r) => r.code,
);

/** Stable English label for a stored reason code (falls back to the raw code). */
export function reasonLabelEn(code: string): string {
  return REPORT_REASONS.find((r) => r.code === code)?.labelEn ?? code;
}
