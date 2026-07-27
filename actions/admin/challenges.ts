"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ChallengeSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
  titleEn: z.string().min(1).max(120),
  titleFa: z.string().min(1).max(120),
  descriptionEn: z.string().max(500).default(""),
  descriptionFa: z.string().max(500).default(""),
  unlockCostCoins: z.number().int().min(0).max(1_000_000),
  targetScore: z.number().int().min(1).max(10_000),
  rewardBadgeSlug: z.string().max(64).nullable().optional(),
  rewardBadgeEmoji: z.string().max(8).nullable().optional(),
  /** Empty = any public eligible category. */
  categoryIds: z.array(z.string().min(1)).max(40).default([]),
  isActive: z.boolean(),
  startsAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
});

export type AdminRecordChallenge = {
  id: string;
  slug: string;
  titleEn: string;
  titleFa: string;
  descriptionEn: string;
  descriptionFa: string;
  unlockCostCoins: number;
  targetScore: number;
  rewardBadgeSlug: string | null;
  rewardBadgeEmoji: string | null;
  categoryIds: string[];
  categoryLabels: string[];
  isActive: boolean;
  startsAt: string;
  expiresAt: string | null;
  unlockCount: number;
  conquerCount: number;
};

export type AdminCategoryOption = {
  id: string;
  slug: string;
  nameEn: string;
  nameFa: string;
  challengeOnly: boolean;
  locales: string[];
};

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function listAdminCategories(): Promise<AdminCategoryOption[]> {
  const rows = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ challengeOnly: "desc" }, { nameEn: "asc" }],
    select: {
      id: true,
      slug: true,
      nameEn: true,
      nameFa: true,
      challengeOnly: true,
      locales: true,
    },
  });
  return rows;
}

export async function listAdminRecordChallenges(): Promise<
  AdminRecordChallenge[]
> {
  const rows = await prisma.recordChallenge.findMany({
    orderBy: [{ isActive: "desc" }, { expiresAt: "asc" }, { createdAt: "desc" }],
    include: {
      categories: {
        include: { category: { select: { id: true, nameEn: true } } },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: {
          access: true,
          runs: true,
        },
      },
      runs: {
        where: { conqueredAt: { not: null } },
        select: { id: true },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    titleEn: r.titleEn,
    titleFa: r.titleFa,
    descriptionEn: r.descriptionEn,
    descriptionFa: r.descriptionFa,
    unlockCostCoins: r.unlockCostCoins,
    targetScore: r.targetScore,
    rewardBadgeSlug: r.rewardBadgeSlug,
    rewardBadgeEmoji: r.rewardBadgeEmoji,
    categoryIds: r.categories.map((l) => l.categoryId),
    categoryLabels: r.categories.map((l) => l.category.nameEn),
    isActive: r.isActive,
    startsAt: r.startsAt.toISOString(),
    expiresAt: r.expiresAt?.toISOString() ?? null,
    unlockCount: r._count.access,
    conquerCount: r.runs.length,
  }));
}

async function syncChallengeCategories(
  challengeId: string,
  categoryIds: string[],
) {
  const unique = [...new Set(categoryIds.filter(Boolean))];
  if (unique.length > 0) {
    const found = await prisma.category.findMany({
      where: { id: { in: unique }, isActive: true },
      select: { id: true },
    });
    if (found.length !== unique.length) {
      throw new Error("category_not_found");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.recordChallengeCategory.deleteMany({ where: { challengeId } });
    if (unique.length === 0) return;
    await tx.recordChallengeCategory.createMany({
      data: unique.map((categoryId) => ({ challengeId, categoryId })),
    });
  });
}

export async function upsertAdminRecordChallenge(
  raw: z.infer<typeof ChallengeSchema>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = ChallengeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid" };
  }
  const data = parsed.data;
  const startsAt = parseDate(data.startsAt) ?? new Date();
  const expiresAt = parseDate(data.expiresAt ?? null);

  if (expiresAt && expiresAt.getTime() <= startsAt.getTime()) {
    return { ok: false, error: "expiresAt must be after startsAt" };
  }

  try {
    if (data.id) {
      await prisma.recordChallenge.update({
        where: { id: data.id },
        data: {
          slug: data.slug,
          titleEn: data.titleEn,
          titleFa: data.titleFa,
          descriptionEn: data.descriptionEn,
          descriptionFa: data.descriptionFa,
          unlockCostCoins: data.unlockCostCoins,
          targetScore: data.targetScore,
          rewardBadgeSlug: data.rewardBadgeSlug || null,
          rewardBadgeEmoji: data.rewardBadgeEmoji || "🏆",
          isActive: data.isActive,
          startsAt,
          expiresAt,
        },
      });
      await syncChallengeCategories(data.id, data.categoryIds);
      revalidatePath("/admin/challenges");
      revalidatePath("/play");
      return { ok: true, id: data.id };
    }

    const created = await prisma.recordChallenge.create({
      data: {
        slug: data.slug,
        titleEn: data.titleEn,
        titleFa: data.titleFa,
        descriptionEn: data.descriptionEn,
        descriptionFa: data.descriptionFa,
        unlockCostCoins: data.unlockCostCoins,
        targetScore: data.targetScore,
        rewardBadgeSlug: data.rewardBadgeSlug || null,
        rewardBadgeEmoji: data.rewardBadgeEmoji || "🏆",
        isActive: data.isActive,
        startsAt,
        expiresAt,
      },
    });
    await syncChallengeCategories(created.id, data.categoryIds);
    revalidatePath("/admin/challenges");
    revalidatePath("/play");
    return { ok: true, id: created.id };
  } catch (err) {
    console.error("[upsertAdminRecordChallenge]", err);
    const msg = err instanceof Error ? err.message : "save_failed";
    if (msg === "category_not_found") {
      return { ok: false, error: "category_not_found" };
    }
    if (msg.includes("Unique constraint")) {
      return { ok: false, error: "slug_taken" };
    }
    return { ok: false, error: "save_failed" };
  }
}

export async function toggleAdminRecordChallengeActive(
  id: string,
  isActive: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "not_found" };
  try {
    await prisma.recordChallenge.update({
      where: { id },
      data: { isActive },
    });
    revalidatePath("/admin/challenges");
    revalidatePath("/play");
    return { ok: true };
  } catch {
    return { ok: false, error: "toggle_failed" };
  }
}

export async function deleteAdminRecordChallenge(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "not_found" };
  try {
    await prisma.recordChallenge.delete({ where: { id } });
    revalidatePath("/admin/challenges");
    revalidatePath("/play");
    return { ok: true };
  } catch {
    return { ok: false, error: "delete_failed" };
  }
}
