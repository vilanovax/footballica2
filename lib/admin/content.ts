/**
 * Build the persisted `content` JSON for a question. Per-locale `category`
 * labels are derived from the linked Category (nameEn/nameFa) so the in-game
 * QuestionCard shows a category without a separate free-text field.
 *
 * Framework-free (returns a plain object) so both the CRUD and import actions
 * can share it; callers cast to `Prisma.InputJsonValue` at the write site.
 */
import { createHash } from "crypto";
import {
  parseCareerPath,
  parseHigherLower,
} from "@/lib/quiz/formats";

type LocaleInput = {
  text: string;
  options: string[];
  careerPath?: { steps: { name: string; logoUrl?: string | null }[] };
  higherLower?: {
    left: { name: string; imageUrl?: string | null };
    right: { name: string; imageUrl?: string | null };
    metricLabel: string;
  };
};

function cleanLocale(locale: LocaleInput, categoryName: string) {
  const careerPath = parseCareerPath(locale.careerPath);
  const higherLower = parseHigherLower(locale.higherLower);
  return {
    text: locale.text,
    options: locale.options,
    category: categoryName,
    ...(careerPath ? { careerPath } : {}),
    ...(higherLower ? { higherLower } : {}),
  };
}

export function buildLocalizedContent(
  content: { en: LocaleInput; fa: LocaleInput },
  category: { nameEn: string; nameFa: string },
) {
  return {
    en: cleanLocale(content.en, category.nameEn),
    fa: cleanLocale(content.fa, category.nameFa),
  };
}

/**
 * Deterministic fingerprint of a question's meaning for EXACT-duplicate
 * detection (Layer 1). Includes format payloads when present.
 */
export function computeContentHash(content: {
  en: LocaleInput;
  fa: LocaleInput;
}): string {
  const norm = (s: string) =>
    s
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/\u200c/g, "")
      .replace(/\s+/g, " ");

  const formatBits = (locale: LocaleInput) => {
    const cp = parseCareerPath(locale.careerPath);
    const hl = parseHigherLower(locale.higherLower);
    return [
      cp ? cp.steps.map((s) => norm(s.name)).join(">") : "",
      hl
        ? [
            norm(hl.left.name),
            norm(hl.right.name),
            norm(hl.metricLabel),
          ].join("|")
        : "",
    ];
  };

  const parts = [
    norm(content.en.text),
    ...content.en.options.map(norm),
    ...formatBits(content.en),
    norm(content.fa.text),
    ...content.fa.options.map(norm),
    ...formatBits(content.fa),
  ];

  return createHash("sha256").update(parts.join("\u0001")).digest("hex");
}
