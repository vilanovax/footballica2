/**
 * Build the persisted `content` JSON for a question. Per-locale `category`
 * labels are derived from the linked Category (nameEn/nameFa) so the in-game
 * QuestionCard shows a category without a separate free-text field.
 *
 * Framework-free (returns a plain object) so both the CRUD and import actions
 * can share it; callers cast to `Prisma.InputJsonValue` at the write site.
 */
import { createHash } from "crypto";

type LocaleInput = { text: string; options: string[] };

export function buildLocalizedContent(
  content: { en: LocaleInput; fa: LocaleInput },
  category: { nameEn: string; nameFa: string },
) {
  return {
    en: {
      text: content.en.text,
      options: content.en.options,
      category: category.nameEn,
    },
    fa: {
      text: content.fa.text,
      options: content.fa.options,
      category: category.nameFa,
    },
  };
}

/**
 * Deterministic fingerprint of a question's meaning for EXACT-duplicate
 * detection (Layer 1). Normalizes case/whitespace/ZWNJ across both locales'
 * text + options so trivially-reworded copies collide. Semantic near-dupes
 * ("capital of Spain" vs "which city is Spain's capital") are a later
 * embedding-based layer — this only catches literal repeats.
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

  const parts = [
    norm(content.en.text),
    ...content.en.options.map(norm),
    norm(content.fa.text),
    ...content.fa.options.map(norm),
  ];

  return createHash("sha256").update(parts.join("\u0001")).digest("hex");
}
