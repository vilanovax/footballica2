import { z } from "zod";

/** Per-locale content: the prompt text + exactly four answer options. */
export const localeContentSchema = z.object({
  text: z.string().trim().min(1, "Question text is required"),
  options: z
    .array(z.string().trim().min(1, "Option cannot be empty"))
    .length(4, "Exactly 4 options are required"),
});

/**
 * Shared create/edit validation for admin questions. Used by BOTH the client
 * form (RHF resolver) and the server actions (never trust the client).
 */
export const questionFormSchema = z
  .object({
    type: z.enum(["TEXT", "IMAGE"]),
    // Kept a plain required string (defaults to "" in the form) so the schema's
    // input and output types match — avoids zodResolver generic mismatches.
    mediaUrl: z.string().trim(),
    categoryId: z.string().min(1, "Select a category"),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
    correctIndex: z.number().int().min(0).max(3),
    content: z.object({
      en: localeContentSchema,
      fa: localeContentSchema,
    }),
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
  /** Optional per-question tag slugs (merged with the global import tags). */
  tags: z.array(z.string().trim().min(1)).optional().default([]),
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
  content: {
    en: { text: "", options: ["", "", "", ""] },
    fa: { text: "", options: ["", "", "", ""] },
  },
};
