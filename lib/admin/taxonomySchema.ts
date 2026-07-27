import { z } from "zod";

/** Normalize free text into a URL-safe slug (lowercase, hyphenated). */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const slugField = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(60)
  .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only");

const localeEnum = z.enum(["en", "fa"]);

export const categorySchema = z.object({
  slug: slugField,
  nameEn: z.string().trim().min(1, "English name is required").max(60),
  nameFa: z.string().trim().min(1, "Persian name is required").max(60),
  icon: z.string().trim().max(8).optional().nullable(),
  isActive: z.boolean().default(true),
  /** Exclusive to premium RecordChallenges — hidden from free Survival / Duel. */
  challengeOnly: z.boolean().default(false),
  /** UI locales that may see this bank. At least one required. */
  locales: z
    .array(localeEnum)
    .min(1, "Pick at least one language")
    .default(["en", "fa"]),
});

export const tagSchema = z.object({
  slug: slugField,
  nameEn: z.string().trim().min(1, "English name is required").max(60),
  nameFa: z.string().trim().min(1, "Persian name is required").max(60),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type TagInput = z.infer<typeof tagSchema>;
