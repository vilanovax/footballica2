"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";
import {
  categorySchema,
  tagSchema,
  type CategoryInput,
  type TagInput,
} from "@/lib/admin/taxonomySchema";

export type TaxonomyResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

async function assertAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

function revalidateTaxonomy() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/questions");
  revalidatePath("/admin");
}

/** Prisma unique-constraint (duplicate slug) guard. */
function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function createCategory(
  input: CategoryInput,
): Promise<TaxonomyResult> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }

  try {
    const cat = await prisma.category.create({
      data: {
        slug: parsed.data.slug,
        nameEn: parsed.data.nameEn,
        nameFa: parsed.data.nameFa,
        icon: parsed.data.icon || null,
        isActive: parsed.data.isActive,
        challengeOnly: parsed.data.challengeOnly,
        locales: [...new Set(parsed.data.locales)],
      },
    });
    revalidateTaxonomy();
    return { ok: true, id: cat.id };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, error: `Slug "${parsed.data.slug}" already exists.` };
    }
    return { ok: false, error: "Could not create category." };
  }
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
): Promise<TaxonomyResult> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }

  try {
    await prisma.category.update({
      where: { id },
      data: {
        slug: parsed.data.slug,
        nameEn: parsed.data.nameEn,
        nameFa: parsed.data.nameFa,
        icon: parsed.data.icon || null,
        isActive: parsed.data.isActive,
        challengeOnly: parsed.data.challengeOnly,
        locales: [...new Set(parsed.data.locales)],
      },
    });
    revalidatePath("/play");
    revalidatePath("/admin/challenges");
    revalidateTaxonomy();
    return { ok: true, id };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, error: `Slug "${parsed.data.slug}" already exists.` };
    }
    return { ok: false, error: "Could not update category." };
  }
}

export async function toggleCategoryStatus(
  id: string,
  isActive: boolean,
): Promise<TaxonomyResult> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };

  try {
    await prisma.category.update({ where: { id }, data: { isActive } });
    revalidateTaxonomy();
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Category not found." };
  }
}

export async function toggleCategoryChallengeOnly(
  id: string,
  challengeOnly: boolean,
): Promise<TaxonomyResult> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };

  try {
    await prisma.category.update({ where: { id }, data: { challengeOnly } });
    revalidateTaxonomy();
    revalidatePath("/play");
    revalidatePath("/admin/challenges");
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Category not found." };
  }
}

export async function deleteCategory(id: string): Promise<TaxonomyResult> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };

  // Guard: don't orphan questions silently. Force deactivation instead.
  const count = await prisma.question.count({ where: { categoryId: id } });
  if (count > 0) {
    return {
      ok: false,
      error: `Category has ${count} question(s). Deactivate it instead of deleting.`,
    };
  }

  try {
    await prisma.category.delete({ where: { id } });
    revalidateTaxonomy();
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Category not found." };
  }
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export async function createTag(input: TagInput): Promise<TaxonomyResult> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };

  const parsed = tagSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }

  try {
    const tag = await prisma.tag.create({ data: parsed.data });
    revalidateTaxonomy();
    return { ok: true, id: tag.id };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, error: `Slug "${parsed.data.slug}" already exists.` };
    }
    return { ok: false, error: "Could not create tag." };
  }
}

export async function updateTag(
  id: string,
  input: TagInput,
): Promise<TaxonomyResult> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };

  const parsed = tagSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data." };
  }

  try {
    await prisma.tag.update({ where: { id }, data: parsed.data });
    revalidateTaxonomy();
    return { ok: true, id };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, error: `Slug "${parsed.data.slug}" already exists.` };
    }
    return { ok: false, error: "Could not update tag." };
  }
}

export async function deleteTag(id: string): Promise<TaxonomyResult> {
  if (!(await assertAdmin())) return { ok: false, error: "Unauthorized." };

  try {
    await prisma.tag.delete({ where: { id } });
    revalidateTaxonomy();
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Tag not found." };
  }
}
