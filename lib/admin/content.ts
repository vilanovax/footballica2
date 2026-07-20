/**
 * Build the persisted `content` JSON for a question. Per-locale `category`
 * labels are derived from the linked Category (nameEn/nameFa) so the in-game
 * QuestionCard shows a category without a separate free-text field.
 *
 * Framework-free (returns a plain object) so both the CRUD and import actions
 * can share it; callers cast to `Prisma.InputJsonValue` at the write site.
 */
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
