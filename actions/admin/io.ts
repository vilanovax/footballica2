"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";
import { buildLocalizedContent } from "@/lib/admin/content";
import { importPayloadSchema } from "@/lib/admin/questionSchema";

async function assertAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

/** Portable shape of a question inside an export/backup file. */
type ExportedQuestion = {
  type: "TEXT" | "IMAGE";
  mediaUrl: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  correctIndex: number;
  content: unknown;
  tags: string[];
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
  | { ok: true; created: number }
  | { ok: false; error: string };

/**
 * Export questions as a portable JSON bundle. Pass a `categoryId` to back up a
 * single category, or omit it to export the whole bank.
 */
export async function exportQuestions(
  categoryId?: string,
): Promise<ExportResult> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };

  const rows = await prisma.question.findMany({
    where: categoryId ? { categoryId } : {},
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
        tags: q.tags.map((t) => t.slug),
      })),
    },
  };
}

/**
 * Restore/import questions from a parsed JSON payload into a target category.
 * `globalTags` are applied to every imported question (merged with any tags
 * embedded per question). Missing tags are created on the fly (slug-named).
 */
export async function importQuestions(input: {
  categoryId: string;
  globalTags?: string[];
  payload: unknown;
}): Promise<ImportResult> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };

  if (!input.categoryId) {
    return { ok: false, error: "Select a target category." };
  }

  const parsed = importPayloadSchema.safeParse(input.payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Invalid file: ${parsed.error.issues[0]?.message ?? "bad format"}`,
    };
  }
  const questions = Array.isArray(parsed.data)
    ? parsed.data
    : parsed.data.questions;

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { nameEn: true, nameFa: true },
  });
  if (!category) return { ok: false, error: "Target category not found." };

  const globalTags = (input.globalTags ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  try {
    await prisma.$transaction(
      questions.map((q) => {
        const slugs = Array.from(
          new Set([
            ...globalTags,
            ...q.tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
          ]),
        );

        return prisma.question.create({
          data: {
            type: q.type,
            mediaUrl: q.type === "IMAGE" ? (q.mediaUrl ?? null) : null,
            difficulty: q.difficulty,
            correctIndex: q.correctIndex,
            categoryId: input.categoryId,
            isActive: true,
            content: buildLocalizedContent(
              q.content,
              category,
            ) as Prisma.InputJsonValue,
            tags: slugs.length
              ? {
                  connectOrCreate: slugs.map((slug) => ({
                    where: { slug },
                    create: { slug, nameEn: slug, nameFa: slug },
                  })),
                }
              : undefined,
          },
        });
      }),
    );
  } catch {
    return { ok: false, error: "Import failed while writing to the database." };
  }

  revalidatePath("/admin/questions");
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  return { ok: true, created: questions.length };
}
