"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";
import { buildLocalizedContent, computeContentHash } from "@/lib/admin/content";
import {
  questionFormSchema,
  QUESTION_STATUSES,
  normalizeExplanation,
  type QuestionFormValues,
} from "@/lib/admin/questionSchema";

type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

// Defense in depth: the Proxy only mints the cookie — it does NOT authorize
// Server Functions. Every mutating action verifies the admin session itself.
async function assertAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

function buildContent(
  values: QuestionFormValues,
  category: { nameEn: string; nameFa: string },
): Prisma.InputJsonValue {
  const built = buildLocalizedContent(values.content, category);
  // Persist format blobs only for the matching QuestionType.
  if (values.type !== "CAREER_PATH") {
    delete (built.en as { careerPath?: unknown }).careerPath;
    delete (built.fa as { careerPath?: unknown }).careerPath;
  }
  if (values.type !== "HIGHER_LOWER") {
    delete (built.en as { higherLower?: unknown }).higherLower;
    delete (built.fa as { higherLower?: unknown }).higherLower;
  }
  return built;
}

/** "" → null, and drop unparseable dates rather than persisting Invalid Date. */
function parseAsOfDate(raw: string): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** True when a write failed on the contentHash unique constraint. */
function isDuplicateHashError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    (err.meta?.target as string[] | undefined)?.some((t) =>
      t.includes("contentHash"),
    ) === true
  );
}

export async function createQuestion(
  input: QuestionFormValues,
): Promise<ActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };

  const parsed = questionFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }
  const values = parsed.data;

  const category = await prisma.category.findUnique({
    where: { id: values.categoryId },
    select: { nameEn: true, nameFa: true },
  });
  if (!category) return { ok: false, error: "Selected category not found." };

  try {
    const created = await prisma.question.create({
      data: {
        type: values.type,
        mediaUrl:
          values.type === "IMAGE" || values.type === "REVEAL_IMAGE"
            ? values.mediaUrl
            : null,
        categoryId: values.categoryId,
        difficulty: values.difficulty,
        correctIndex: values.correctIndex,
        content: buildContent(values, category),
        explanation: normalizeExplanation(values.explanation) ?? Prisma.DbNull,
        status: values.status,
        isTemporal: values.isTemporal,
        asOfDate: parseAsOfDate(values.asOfDate),
        source: values.source || null,
        contentHash: computeContentHash(values.content),
        tags: values.tagIds.length
          ? { connect: values.tagIds.map((id) => ({ id })) }
          : undefined,
        // Mirror primary into M2N so Draw sees the home bank membership.
        categories: {
          create: [{ categoryId: values.categoryId }],
        },
      },
      select: { id: true },
    });

    revalidatePath("/admin/questions");
    return { ok: true, id: created.id };
  } catch (err) {
    if (isDuplicateHashError(err)) {
      return {
        ok: false,
        error: "A question with identical content already exists.",
      };
    }
    console.error("createQuestion failed", err);
    return { ok: false, error: "Could not create question." };
  }
}

export async function updateQuestion(
  id: string,
  input: QuestionFormValues,
): Promise<ActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };

  const parsed = questionFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }
  const values = parsed.data;

  const category = await prisma.category.findUnique({
    where: { id: values.categoryId },
    select: { nameEn: true, nameFa: true },
  });
  if (!category) return { ok: false, error: "Selected category not found." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.question.update({
        where: { id },
        data: {
          type: values.type,
          mediaUrl:
            values.type === "IMAGE" || values.type === "REVEAL_IMAGE"
              ? values.mediaUrl
              : null,
          categoryId: values.categoryId,
          difficulty: values.difficulty,
          correctIndex: values.correctIndex,
          content: buildContent(values, category),
          explanation:
            normalizeExplanation(values.explanation) ?? Prisma.DbNull,
          status: values.status,
          isTemporal: values.isTemporal,
          asOfDate: parseAsOfDate(values.asOfDate),
          source: values.source || null,
          contentHash: computeContentHash(values.content),
          tags: { set: values.tagIds.map((id) => ({ id })) },
        },
      });
      // Ensure primary category is always a Draw membership (keep extra links).
      await tx.questionCategory.upsert({
        where: {
          questionId_categoryId: {
            questionId: id,
            categoryId: values.categoryId,
          },
        },
        create: { questionId: id, categoryId: values.categoryId },
        update: {},
      });
    });
  } catch (err) {
    if (isDuplicateHashError(err)) {
      return {
        ok: false,
        error: "A question with identical content already exists.",
      };
    }
    return { ok: false, error: "Question not found or update failed." };
  }

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}/edit`);
  return { ok: true, id };
}

/** Set a question's publishing lifecycle status (DRAFT/IN_REVIEW/PUBLISHED/RETIRED). */
export async function setQuestionStatus(
  id: string,
  status: QuestionStatus,
): Promise<ActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };

  if (!QUESTION_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  try {
    await prisma.question.update({ where: { id }, data: { status } });
  } catch {
    return { ok: false, error: "Question not found." };
  }

  revalidatePath("/admin/questions");
  return { ok: true, id };
}
