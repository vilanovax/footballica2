"use server";

import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import {
  ensureBadgeCatalog,
  listBadgePresentations,
  type BadgePresentation,
} from "@/lib/game/badgeCatalog";

export type AdminBadge = BadgePresentation & { id: string };

export type BadgeActionResult =
  | { ok: true; badge?: AdminBadge }
  | { ok: false; error: string };

export async function listAdminBadges(): Promise<AdminBadge[]> {
  await ensureBadgeCatalog();
  const rows = await prisma.badgeDefinition.findMany({
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    nameEn: r.nameEn,
    nameFa: r.nameFa,
    descriptionEn: r.descriptionEn,
    descriptionFa: r.descriptionFa,
    emoji: r.emoji,
    imageUrl: r.imageUrl,
    rewardCoins: r.rewardCoins,
    rewardXp: r.rewardXp,
    category: r.category as AdminBadge["category"],
    tier: r.tier as AdminBadge["tier"],
    isSystem: r.isSystem,
    isActive: r.isActive,
    sortOrder: r.sortOrder,
  }));
}

export async function updateBadgeDefinition(input: {
  id: string;
  nameEn: string;
  nameFa: string;
  descriptionEn: string;
  descriptionFa: string;
  emoji: string;
  imageUrl: string | null;
  rewardCoins: number;
  rewardXp: number;
  category: string;
  tier: string;
  isActive: boolean;
  sortOrder: number;
}): Promise<BadgeActionResult> {
  try {
    const id = input.id.trim();
    if (!id) return { ok: false, error: "missing_id" };

    const nameEn = input.nameEn.trim();
    const nameFa = input.nameFa.trim();
    if (!nameEn || !nameFa) return { ok: false, error: "name_required" };

    const updated = await prisma.badgeDefinition.update({
      where: { id },
      data: {
        nameEn,
        nameFa,
        descriptionEn: input.descriptionEn.trim(),
        descriptionFa: input.descriptionFa.trim(),
        emoji: input.emoji.trim() || "🏅",
        imageUrl: input.imageUrl?.trim() || null,
        rewardCoins: Math.max(0, Math.round(input.rewardCoins)),
        rewardXp: Math.max(0, Math.round(input.rewardXp)),
        category: input.category.trim() || "skill",
        tier: input.tier.trim() || "bronze",
        isActive: Boolean(input.isActive),
        sortOrder: Math.max(0, Math.round(input.sortOrder)),
      },
    });

    revalidatePath("/admin/badges");
    revalidatePath("/profile");
    revalidatePath("/play");

    return {
      ok: true,
      badge: {
        id: updated.id,
        slug: updated.slug,
        nameEn: updated.nameEn,
        nameFa: updated.nameFa,
        descriptionEn: updated.descriptionEn,
        descriptionFa: updated.descriptionFa,
        emoji: updated.emoji,
        imageUrl: updated.imageUrl,
        rewardCoins: updated.rewardCoins,
        rewardXp: updated.rewardXp,
        category: updated.category as AdminBadge["category"],
        tier: updated.tier as AdminBadge["tier"],
        isSystem: updated.isSystem,
        isActive: updated.isActive,
        sortOrder: updated.sortOrder,
      },
    };
  } catch (err) {
    console.error("[updateBadgeDefinition]", err);
    return { ok: false, error: "save_failed" };
  }
}

/**
 * Upload badge art into `public/badges/{slug}.{ext}` and store the public path.
 */
export async function uploadBadgeImage(formData: FormData): Promise<BadgeActionResult> {
  try {
    const id = String(formData.get("id") ?? "").trim();
    const file = formData.get("file");
    if (!id || !(file instanceof File) || file.size === 0) {
      return { ok: false, error: "invalid_upload" };
    }
    if (file.size > 1_500_000) {
      return { ok: false, error: "file_too_large" };
    }

    const badge = await prisma.badgeDefinition.findUnique({ where: { id } });
    if (!badge) return { ok: false, error: "not_found" };

    const mime = file.type || "";
    const ext =
      mime === "image/png"
        ? "png"
        : mime === "image/webp"
          ? "webp"
          : mime === "image/jpeg" || mime === "image/jpg"
            ? "jpg"
            : null;
    if (!ext) return { ok: false, error: "unsupported_type" };

    const dir = path.join(process.cwd(), "public", "badges");
    await mkdir(dir, { recursive: true });
    const filename = `${badge.slug}.${ext}`;
    const abs = path.join(dir, filename);
    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(abs, buf);

    const imageUrl = `/badges/${filename}?v=${Date.now()}`;
    const updated = await prisma.badgeDefinition.update({
      where: { id },
      data: { imageUrl },
    });

    revalidatePath("/admin/badges");
    revalidatePath("/profile");

    return {
      ok: true,
      badge: {
        id: updated.id,
        slug: updated.slug,
        nameEn: updated.nameEn,
        nameFa: updated.nameFa,
        descriptionEn: updated.descriptionEn,
        descriptionFa: updated.descriptionFa,
        emoji: updated.emoji,
        imageUrl: updated.imageUrl,
        rewardCoins: updated.rewardCoins,
        rewardXp: updated.rewardXp,
        category: updated.category as AdminBadge["category"],
        tier: updated.tier as AdminBadge["tier"],
        isSystem: updated.isSystem,
        isActive: updated.isActive,
        sortOrder: updated.sortOrder,
      },
    };
  } catch (err) {
    console.error("[uploadBadgeImage]", err);
    return { ok: false, error: "upload_failed" };
  }
}

/** Convenience for pages that only need presentations. */
export async function getPublicBadgeCatalog(): Promise<BadgePresentation[]> {
  return listBadgePresentations();
}
