"use server";

import { prisma } from "@/lib/prisma";
import type { MysteryPlayerOption } from "@/lib/mystery/types";

export type SearchMysteryPlayersResult =
  | { ok: true; players: MysteryPlayerOption[] }
  | { ok: false; error: "invalid" | "server_error" };

/** Lightweight autocomplete for Mystery / Star Path / duel specials. */
export async function searchMysteryPlayers(
  query: string,
): Promise<SearchMysteryPlayersResult> {
  const q = typeof query === "string" ? query.trim() : "";
  if (q.length < 2) return { ok: true, players: [] };

  try {
    const rows = await prisma.footballPlayer.findMany({
      where: {
        isActive: true,
        OR: [
          { nameEn: { contains: q, mode: "insensitive" } },
          { nameFa: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 12,
      orderBy: { nameEn: "asc" },
      select: {
        slug: true,
        nameEn: true,
        nameFa: true,
        club: true,
        nationalityCode: true,
      },
    });

    return {
      ok: true,
      players: rows.map((r) => ({
        id: r.slug,
        nameEn: r.nameEn,
        nameFa: r.nameFa,
        club: r.club,
        nationalityCode: r.nationalityCode,
      })),
    };
  } catch (err) {
    console.error("searchMysteryPlayers failed", err);
    return { ok: false, error: "server_error" };
  }
}
