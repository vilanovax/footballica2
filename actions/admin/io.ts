"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";
import { buildLocalizedContent } from "@/lib/admin/content";
import {
  importPayloadSchema,
  normalizeExplanation,
  type ImportQuestion,
} from "@/lib/admin/questionSchema";
import {
  buildTriageBatch,
  hashImportQuestion,
  type ExistingQuestionRef,
  type TriageItem,
  type TaxonomyRef,
} from "@/lib/admin/importTriage";
import { inCategoryWhere } from "@/lib/quiz/inCategory";

async function assertAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

/** Portable shape of a question inside an export/backup file. */
type ExportedQuestion = {
  type: "TEXT" | "IMAGE" | "CAREER_PATH" | "HIGHER_LOWER" | "REVEAL_IMAGE";
  mediaUrl: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  correctIndex: number;
  content: unknown;
  explanation: { en: string; fa: string } | null;
  tags: string[];
  status: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "RETIRED";
  isTemporal: boolean;
  asOfDate: string | null;
  source: string | null;
};

export type ExportBundle = {
  version: 1;
  exportedAt: string;
  category: { slug: string; nameEn: string; nameFa: string } | null;
  count: number;
  questions: ExportedQuestion[];
};

export type ExportResult =
  | { ok: true; bundle: ExportBundle }
  | { ok: false; error: string };

export type ImportResult =
  | {
      ok: true;
      created: number;
      attached: number;
      skipped: number;
    }
  | { ok: false; error: string };

export type PreviewImportResult =
  | {
      ok: true;
      items: TriageItem[];
      summary: { neu: number; attach: number; skip: number };
    }
  | { ok: false; error: string };

function parseQuestions(payload: unknown): ImportQuestion[] | null {
  const parsed = importPayloadSchema.safeParse(payload);
  if (!parsed.success) return null;
  return Array.isArray(parsed.data) ? parsed.data : parsed.data.questions;
}

async function loadTaxonomy(): Promise<{
  categories: TaxonomyRef[];
  tags: TaxonomyRef[];
}> {
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, slug: true, nameEn: true },
    }),
    prisma.tag.findMany({
      select: { id: true, slug: true, nameEn: true },
    }),
  ]);
  return { categories, tags };
}

async function loadExistingByHash(
  hashes: string[],
): Promise<Map<string, ExistingQuestionRef>> {
  const unique = Array.from(new Set(hashes.filter(Boolean)));
  const map = new Map<string, ExistingQuestionRef>();
  if (unique.length === 0) return map;

  const rows = await prisma.question.findMany({
    where: { contentHash: { in: unique } },
    select: {
      id: true,
      contentHash: true,
      categoryId: true,
      category: { select: { nameEn: true } },
      categories: { select: { categoryId: true } },
      tags: { select: { slug: true } },
    },
  });

  for (const row of rows) {
    if (!row.contentHash) continue;
    const categoryIds = Array.from(
      new Set([
        ...(row.categoryId ? [row.categoryId] : []),
        ...row.categories.map((c) => c.categoryId),
      ]),
    );
    map.set(row.contentHash, {
      id: row.id,
      contentHash: row.contentHash,
      categoryId: row.categoryId,
      categoryNameEn: row.category?.nameEn ?? null,
      categoryIds,
      tagSlugs: row.tags.map((t) => t.slug),
    });
  }
  return map;
}

async function triagePayload(input: {
  categoryId: string;
  globalTags?: string[];
  payload: unknown;
}): Promise<
  | { ok: true; items: TriageItem[]; questions: ImportQuestion[] }
  | { ok: false; error: string }
> {
  if (!input.categoryId) {
    return { ok: false, error: "Select a target category." };
  }

  const questions = parseQuestions(input.payload);
  if (!questions) {
    return { ok: false, error: "Invalid file: bad JSON format." };
  }

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true },
  });
  if (!category) return { ok: false, error: "Target category not found." };

  const globalTags = (input.globalTags ?? [])
    .map((t) => t.trim())
    .filter(Boolean);

  const { categories, tags } = await loadTaxonomy();

  const hashes = questions.map(hashImportQuestion);
  const existingByHash = await loadExistingByHash(hashes);

  const items = buildTriageBatch({
    questions,
    fallbackCategoryId: input.categoryId,
    globalTags,
    categories,
    tags,
    existingByHash,
  });

  return { ok: true, items, questions };
}

function tagConnectOrCreate(slugs: string[]) {
  return slugs.length
    ? {
        connectOrCreate: slugs.map((slug) => ({
          where: { slug },
          create: { slug, nameEn: slug, nameFa: slug },
        })),
      }
    : undefined;
}

/**
 * Export questions as a portable JSON bundle. Pass a `categoryId` to back up a
 * single category, or omit it to export the whole bank.
 */
export async function exportQuestions(
  categoryId?: string,
): Promise<ExportResult> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };

  const rows = await prisma.question.findMany({
    where: categoryId ? inCategoryWhere(categoryId) : {},
    include: { category: true, tags: { select: { slug: true } } },
    orderBy: { createdAt: "asc" },
  });

  let category: ExportBundle["category"] = null;
  if (categoryId) {
    const c = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { slug: true, nameEn: true, nameFa: true },
    });
    category = c ?? null;
  }

  return {
    ok: true,
    bundle: {
      version: 1,
      exportedAt: new Date().toISOString(),
      category,
      count: rows.length,
      questions: rows.map((q) => ({
        type: q.type,
        mediaUrl: q.mediaUrl,
        difficulty: q.difficulty,
        correctIndex: q.correctIndex,
        content: q.content,
        explanation: normalizeExplanation(
          q.explanation as { en: string; fa: string } | null,
        ),
        tags: q.tags.map((t) => t.slug),
        status: q.status,
        isTemporal: q.isTemporal,
        asOfDate: q.asOfDate ? q.asOfDate.toISOString() : null,
        source: q.source,
      })),
    },
  };
}

/**
 * Dry-run import triage for the Admin preview (New / Attach / Skip).
 */
export async function previewImportQuestions(input: {
  categoryId: string;
  globalTags?: string[];
  payload: unknown;
}): Promise<PreviewImportResult> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };

  const triaged = await triagePayload(input);
  if (!triaged.ok) return triaged;

  const summary = {
    neu: triaged.items.filter((i) => i.kind === "new").length,
    attach: triaged.items.filter((i) => i.kind === "duplicate_attach").length,
    skip: triaged.items.filter((i) => i.kind === "duplicate_skip").length,
  };

  return { ok: true, items: triaged.items, summary };
}

/**
 * Import with L1 contentHash dedupe:
 * - new → create (+ contentHash, tags, QuestionCategory memberships)
 * - duplicate_attach → add missing M2N banks + tags (no text overwrite)
 * - duplicate_skip → no-op
 */
export async function importQuestions(input: {
  categoryId: string;
  globalTags?: string[];
  payload: unknown;
}): Promise<ImportResult> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };

  const triaged = await triagePayload(input);
  if (!triaged.ok) return triaged;

  const { items } = triaged;

  // Resolve category labels for content.category on creates.
  const categoryIds = Array.from(
    new Set(items.filter((i) => i.kind === "new").map((i) => i.categoryIdForCreate)),
  );
  const categoryRows = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, nameEn: true, nameFa: true },
  });
  const categoryById = new Map(categoryRows.map((c) => [c.id, c]));

  let created = 0;
  let attached = 0;
  let skipped = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.kind === "duplicate_skip") {
          skipped += 1;
          continue;
        }

        if (item.kind === "duplicate_attach") {
          if (
            !item.existingId ||
            (item.tagsToWrite.length === 0 &&
              item.categoryIdsToWrite.length === 0)
          ) {
            // Within-batch attach folded into the "new" row.
            skipped += 1;
            continue;
          }
          if (item.categoryIdsToWrite.length > 0) {
            await tx.questionCategory.createMany({
              data: item.categoryIdsToWrite.map((categoryId) => ({
                questionId: item.existingId!,
                categoryId,
              })),
              skipDuplicates: true,
            });
          }
          if (item.tagsToWrite.length > 0) {
            await tx.question.update({
              where: { id: item.existingId },
              data: { tags: tagConnectOrCreate(item.tagsToWrite) },
            });
          }
          attached += 1;
          continue;
        }

        // kind === "new"
        const cat = categoryById.get(item.categoryIdForCreate);
        if (!cat) {
          throw new Error("Missing category for create.");
        }
        const q = item.question;
        const asOfDate = q.asOfDate ? new Date(q.asOfDate) : null;
        const membershipIds = Array.from(
          new Set([
            item.categoryIdForCreate,
            ...item.categoryIdsToWrite,
          ]),
        );

        await tx.question.create({
          data: {
            type: q.type,
            mediaUrl:
              q.type === "IMAGE" || q.type === "REVEAL_IMAGE"
                ? (q.mediaUrl ?? null)
                : null,
            difficulty: q.difficulty,
            correctIndex: q.correctIndex,
            categoryId: item.categoryIdForCreate,
            status: q.status,
            isTemporal: q.isTemporal,
            asOfDate:
              asOfDate && !Number.isNaN(asOfDate.getTime()) ? asOfDate : null,
            source: q.source ?? null,
            contentHash: item.contentHash,
            content: buildLocalizedContent(
              q.content,
              cat,
            ) as Prisma.InputJsonValue,
            explanation:
              normalizeExplanation(q.explanation ?? null) ?? Prisma.DbNull,
            tags: tagConnectOrCreate(item.tagsToWrite),
            categories: {
              create: membershipIds.map((categoryId) => ({ categoryId })),
            },
          },
        });
        created += 1;
      }
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return {
        ok: false,
        error:
          "Duplicate contentHash conflict — re-run preview and confirm again.",
      };
    }
    return { ok: false, error: "Import failed while writing to the database." };
  }

  revalidatePath("/admin/questions");
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  return { ok: true, created, attached, skipped };
}
