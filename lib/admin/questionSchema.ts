import { z } from "zod";

/** Per-locale content: the prompt text + exactly four answer options. */
export const localeContentSchema = z.object({
  text: z.string().trim().min(1, "Question text is required"),
  options: z
    .array(z.string().trim().min(1, "Option cannot be empty"))
    .length(4, "Exactly 4 options are required"),
});

/** Optional bilingual trivia fact shown after answer reveal. */
export const explanationSchema = z.object({
  en: z.string(),
  fa: z.string(),
});

/**
 * Shared create/edit validation for admin questions. Used by BOTH the client
 * form (RHF resolver) and the server actions (never trust the client).
 */
export const QUESTION_STATUSES = [
  "DRAFT",
  "IN_REVIEW",
  "PUBLISHED",
  "RETIRED",
] as const;

export const questionFormSchema = z
  .object({
    type: z.enum(["TEXT", "IMAGE"]),
    // Kept a plain required string (defaults to "" in the form) so the schema's
    // input and output types match — avoids zodResolver generic mismatches.
    mediaUrl: z.string().trim(),
    categoryId: z.string().min(1, "Select a category"),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
    correctIndex: z.number().int().min(0).max(3),
    // Publishing lifecycle — only PUBLISHED questions are served to players.
    status: z.enum(QUESTION_STATUSES),
    // Content lifecycle metadata. All plain (non-defaulted) so the resolver's
    // input/output types match; the form seeds sensible empties.
    isTemporal: z.boolean(),
    // Kept as a plain string ("" = none, else YYYY-MM-DD); the server coerces
    // it to a Date | null on write.
    asOfDate: z.string().trim(),
    source: z.string().trim(),
    // Plain (non-defaulted) array so the resolver's input/output types match;
    // the form always seeds `tagIds: []`.
    tagIds: z.array(z.string()),
    content: z.object({
      en: localeContentSchema,
      fa: localeContentSchema,
    }),
    explanation: explanationSchema,
  })
  .refine((d) => d.type !== "IMAGE" || d.mediaUrl.length > 0, {
    message: "Media URL is required for IMAGE questions",
    path: ["mediaUrl"],
  });

export type QuestionFormValues = z.infer<typeof questionFormSchema>;

// ─── Import / Restore ────────────────────────────────────────────────────────

/** A single question inside an import/backup file. Category is chosen at import
 *  time (in the UI), so it is NOT part of the per-question payload. */
export const importQuestionSchema = z.object({
  type: z.enum(["TEXT", "IMAGE"]).default("TEXT"),
  mediaUrl: z.string().nullish(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("EASY"),
  correctIndex: z.number().int().min(0).max(3),
  content: z.object({ en: localeContentSchema, fa: localeContentSchema }),
  explanation: explanationSchema.nullish(),
  /** Optional per-question tag slugs (merged with the global import tags). */
  tags: z.array(z.string().trim().min(1)).optional().default([]),
  // Optional production metadata — makes an exported bundle round-trippable.
  status: z.enum(QUESTION_STATUSES).default("PUBLISHED"),
  isTemporal: z.boolean().default(false),
  asOfDate: z.string().nullish(),
  source: z.string().nullish(),
});

/** Accepts either a wrapped backup ({ questions: [...] }) or a bare array. */
export const importPayloadSchema = z.union([
  z.object({ questions: z.array(importQuestionSchema).min(1) }),
  z.array(importQuestionSchema).min(1),
]);

export type ImportQuestion = z.infer<typeof importQuestionSchema>;

/** Empty defaults for the create form. */
export const emptyQuestionForm: QuestionFormValues = {
  type: "TEXT",
  mediaUrl: "",
  categoryId: "",
  difficulty: "EASY",
  correctIndex: 0,
  status: "PUBLISHED",
  isTemporal: false,
  asOfDate: "",
  source: "",
  tagIds: [],
  content: {
    en: { text: "", options: ["", "", "", ""] },
    fa: { text: "", options: ["", "", "", ""] },
  },
  explanation: { en: "", fa: "" },
};

/** Persist null when both locales are blank. */
export function normalizeExplanation(
  exp: { en: string; fa: string } | null | undefined,
): { en: string; fa: string } | null {
  if (!exp) return null;
  const en = exp.en.trim();
  const fa = exp.fa.trim();
  if (!en && !fa) return null;
  return { en, fa };
}
