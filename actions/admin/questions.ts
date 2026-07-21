"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";
import { buildLocalizedContent } from "@/lib/admin/content";
import {
  questionFormSchema,
  type QuestionFormValues,
} from "@/lib/admin/questionSchema";

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
  return buildLocalizedContent(values.content, category);
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

  const created = await prisma.question.create({
    data: {
      type: values.type,
      mediaUrl: values.type === "IMAGE" ? values.mediaUrl : null,
      categoryId: values.categoryId,
      difficulty: values.difficulty,
      correctIndex: values.correctIndex,
      content: buildContent(values, category),
      isActive: true,
      tags: values.tagIds.length
        ? { connect: values.tagIds.map((id) => ({ id })) }
        : undefined,
    },
    select: { id: true },
  });

  revalidatePath("/admin/questions");
  return { ok: true, id: created.id };
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
    await prisma.question.update({
      where: { id },
      data: {
        type: values.type,
        mediaUrl: values.type === "IMAGE" ? values.mediaUrl : null,
        categoryId: values.categoryId,
        difficulty: values.difficulty,
        correctIndex: values.correctIndex,
        content: buildContent(values, category),
        tags: { set: values.tagIds.map((id) => ({ id })) },
      },
    });
  } catch {
    return { ok: false, error: "Question not found or update failed." };
  }

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}/edit`);
  return { ok: true, id };
}

export async function toggleQuestionStatus(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };

  try {
    await prisma.question.update({ where: { id }, data: { isActive } });
  } catch {
    return { ok: false, error: "Question not found." };
  }

  revalidatePath("/admin/questions");
  return { ok: true, id };
}
