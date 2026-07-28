"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin/auth";
import {
  ensureFootballPlayerCatalog,
  normalizePlayerInput,
  serializeAdminPlayer,
  type FootballPlayerAdminRow,
  type PlayerWriteInput,
} from "@/lib/mystery/players";

export type PlayerActionResult =
  | { ok: true; player?: FootballPlayerAdminRow }
  | { ok: false; error: string };

async function assertAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

export async function listAdminPlayers(): Promise<FootballPlayerAdminRow[]> {
  if (!(await assertAdmin())) return [];
  await ensureFootballPlayerCatalog(prisma);
  const rows = await prisma.footballPlayer.findMany({
    orderBy: [{ isActive: "desc" }, { nameEn: "asc" }],
  });
  return rows.map(serializeAdminPlayer);
}

export async function upsertFootballPlayer(
  input: PlayerWriteInput,
): Promise<PlayerActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "unauthorized" };
  const normalized = normalizePlayerInput(input);
  if ("error" in normalized) return { ok: false, error: normalized.error };

  try {
    const row = await prisma.footballPlayer.upsert({
      where: { slug: normalized.slug },
      create: {
        slug: normalized.slug,
        nameEn: normalized.nameEn,
        nameFa: normalized.nameFa,
        nationality: normalized.nationality,
        nationalityCode: normalized.nationalityCode,
        position: normalized.position,
        league: normalized.league,
        club: normalized.club,
        age: normalized.age,
        shirtNumber: normalized.shirtNumber,
        isActive: normalized.isActive,
      },
      update: {
        nameEn: normalized.nameEn,
        nameFa: normalized.nameFa,
        nationality: normalized.nationality,
        nationalityCode: normalized.nationalityCode,
        position: normalized.position,
        league: normalized.league,
        club: normalized.club,
        age: normalized.age,
        shirtNumber: normalized.shirtNumber,
        isActive: normalized.isActive,
      },
    });
    revalidatePath("/admin/players");
    revalidatePath("/admin/mystery");
    revalidatePath("/play/mystery");
    return { ok: true, player: serializeAdminPlayer(row) };
  } catch (err) {
    console.error("[upsertFootballPlayer]", err);
    return { ok: false, error: "unknown" };
  }
}

export async function setFootballPlayerActive(input: {
  slug: string;
  isActive: boolean;
}): Promise<PlayerActionResult> {
  if (!(await assertAdmin())) return { ok: false, error: "unauthorized" };
  const slug = input.slug.trim();
  if (!slug) return { ok: false, error: "slug_invalid" };

  try {
    const row = await prisma.footballPlayer.update({
      where: { slug },
      data: { isActive: Boolean(input.isActive) },
    });
    revalidatePath("/admin/players");
    revalidatePath("/admin/mystery");
    return { ok: true, player: serializeAdminPlayer(row) };
  } catch {
    return { ok: false, error: "not_found" };
  }
}
