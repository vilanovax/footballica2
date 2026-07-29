import { z } from "zod";

/** Loose form shapes — required-ness enforced by type-specific refinements. */
const careerPathSchema = z
  .object({
    steps: z.array(
      z.object({
        name: z.string(),
        logoUrl: z.string().optional().nullable(),
      }),
    ),
  })
  .optional();

const higherLowerSchema = z
  .object({
    left: z.object({
      name: z.string(),
      imageUrl: z.string().optional().nullable(),
    }),
    right: z.object({
      name: z.string(),
      imageUrl: z.string().optional().nullable(),
    }),
    metricLabel: z.string(),
  })
  .optional();

/** Per-locale content: the prompt text + exactly four answer options. */
export const localeContentSchema = z.object({
  text: z.string().trim().min(1, "Question text is required"),
  options: z
    .array(z.string().trim().min(1, "Option cannot be empty"))
    .length(4, "Exactly 4 options are required"),
  careerPath: careerPathSchema,
  higherLower: higherLowerSchema,
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
    type: z.enum([
      "TEXT",
      "IMAGE",
      "CAREER_PATH",
      "HIGHER_LOWER",
      "REVEAL_IMAGE",
    ]),
    mediaUrl: z.string().trim(),
    categoryId: z.string().min(1, "Select a category"),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
    correctIndex: z.number().int().min(0).max(3),
    status: z.enum(QUESTION_STATUSES),
    isTemporal: z.boolean(),
    asOfDate: z.string().trim(),
    source: z.string().trim(),
    tagIds: z.array(z.string()),
    content: z.object({
      en: localeContentSchema,
      fa: localeContentSchema,
    }),
    explanation: explanationSchema,
  })
  .refine(
    (d) =>
      (d.type !== "IMAGE" && d.type !== "REVEAL_IMAGE") ||
      d.mediaUrl.length > 0,
    {
      message: "Media URL is required for image-based formats",
      path: ["mediaUrl"],
    },
  )
  .refine(
    (d) =>
      d.type !== "CAREER_PATH" ||
      (parseSteps(d.content.en.careerPath) >= 2 &&
        parseSteps(d.content.fa.careerPath) >= 2),
    {
      message: "Career path needs at least 2 stops in EN and FA",
      path: ["content", "en", "careerPath"],
    },
  )
  .refine(
    (d) =>
      d.type !== "HIGHER_LOWER" ||
      (hasHigherLower(d.content.en.higherLower) &&
        hasHigherLower(d.content.fa.higherLower)),
    {
      message: "Higher/Lower needs both entities + metric in EN and FA",
      path: ["content", "en", "higherLower"],
    },
  );

function parseSteps(
  path: { steps?: { name?: string }[] } | undefined,
): number {
  return path?.steps?.filter((s) => s.name?.trim()).length ?? 0;
}

function hasHigherLower(
  hl:
    | {
        left?: { name?: string };
        right?: { name?: string };
        metricLabel?: string;
      }
    | undefined,
): boolean {
  return Boolean(
    hl?.left?.name?.trim() &&
      hl?.right?.name?.trim() &&
      hl?.metricLabel?.trim(),
  );
}

export type QuestionFormValues = z.infer<typeof questionFormSchema>;

export const importQuestionSchema = z
  .object({
    type: z
      .enum(["TEXT", "IMAGE", "CAREER_PATH", "HIGHER_LOWER", "REVEAL_IMAGE"])
      .default("TEXT"),
    mediaUrl: z.string().nullish(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("EASY"),
    correctIndex: z.number().int().min(0).max(3),
    content: z.object({ en: localeContentSchema, fa: localeContentSchema }),
    explanation: explanationSchema.nullish(),
    tags: z.array(z.string().trim().min(1)).optional().default([]),
    status: z.enum(QUESTION_STATUSES).default("PUBLISHED"),
    isTemporal: z.boolean().default(false),
    asOfDate: z.string().nullish(),
    source: z.string().nullish(),
  })
  .superRefine((d, ctx) => {
    if (
      (d.type === "IMAGE" || d.type === "REVEAL_IMAGE") &&
      !d.mediaUrl?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        message: "mediaUrl required for IMAGE / REVEAL_IMAGE",
        path: ["mediaUrl"],
      });
    }
    if (
      d.type === "CAREER_PATH" &&
      (parseSteps(d.content.en.careerPath) < 2 ||
        parseSteps(d.content.fa.careerPath) < 2)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "CAREER_PATH needs ≥2 steps in EN and FA",
        path: ["content", "en", "careerPath"],
      });
    }
    if (
      d.type === "HIGHER_LOWER" &&
      (!hasHigherLower(d.content.en.higherLower) ||
        !hasHigherLower(d.content.fa.higherLower))
    ) {
      ctx.addIssue({
        code: "custom",
        message: "HIGHER_LOWER needs both entities + metric in EN and FA",
        path: ["content", "en", "higherLower"],
      });
    }
  });

export const importPayloadSchema = z.union([
  z.object({ questions: z.array(importQuestionSchema).min(1) }),
  z.array(importQuestionSchema).min(1),
]);

export type ImportQuestion = z.infer<typeof importQuestionSchema>;

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

export function normalizeExplanation(
  exp: { en: string; fa: string } | null | undefined,
): { en: string; fa: string } | null {
  if (!exp) return null;
  const en = exp.en.trim();
  const fa = exp.fa.trim();
  if (!en && !fa) return null;
  return { en, fa };
}
