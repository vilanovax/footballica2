import "server-only";

import type { FootballPlayer, Prisma, PrismaClient } from "@/generated/prisma/client";
import type {
  MysteryPlayer,
  MysteryPlayerOption,
  MysteryPosition,
} from "./types";
import {
  pickSlugForDateKey,
  SEED_FOOTBALL_PLAYERS,
} from "./seedCatalog";

type Db = PrismaClient | Prisma.TransactionClient;

const POSITIONS = new Set<MysteryPosition>(["GK", "DEF", "MID", "FWD"]);

export function toMysteryPlayer(row: FootballPlayer): MysteryPlayer {
  const position = POSITIONS.has(row.position as MysteryPosition)
    ? (row.position as MysteryPosition)
    : "MID";
  return {
    id: row.slug,
    nameEn: row.nameEn,
    nameFa: row.nameFa,
    nationality: row.nationality,
    nationalityCode: row.nationalityCode,
    position,
    league: row.league,
    club: row.club,
    age: row.age,
    shirtNumber: row.shirtNumber,
  };
}

/** Idempotent seed of default footballers (skipDuplicates by slug). */
export async function ensureFootballPlayerCatalog(
  db: Db,
): Promise<number> {
  const result = await db.footballPlayer.createMany({
    data: SEED_FOOTBALL_PLAYERS.map((p) => ({
      slug: p.id,
      nameEn: p.nameEn,
      nameFa: p.nameFa,
      nationality: p.nationality,
      nationalityCode: p.nationalityCode,
      position: p.position,
      league: p.league,
      club: p.club,
      age: p.age,
      shirtNumber: p.shirtNumber,
      isActive: true,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

export async function getMysteryPlayer(
  slug: string,
  db: Db,
): Promise<MysteryPlayer | null> {
  const row = await db.footballPlayer.findUnique({ where: { slug } });
  if (!row || !row.isActive) return null;
  return toMysteryPlayer(row);
}

/** Active players for the in-match guess picker. */
export async function listMysteryOptions(
  db: Db,
): Promise<MysteryPlayerOption[]> {
  await ensureFootballPlayerCatalog(db);
  const rows = await db.footballPlayer.findMany({
    where: { isActive: true },
    orderBy: { nameEn: "asc" },
    select: {
      slug: true,
      nameEn: true,
      nameFa: true,
      club: true,
      nationalityCode: true,
    },
  });
  return rows.map((r) => ({
    id: r.slug,
    nameEn: r.nameEn,
    nameFa: r.nameFa,
    club: r.club,
    nationalityCode: r.nationalityCode,
  }));
}

/** Slug for auto-publish when Live-Ops has not set today's puzzle. */
export async function pickAutoTargetSlug(
  dateKey: string,
  db: Db,
): Promise<string> {
  await ensureFootballPlayerCatalog(db);
  const rows = await db.footballPlayer.findMany({
    where: { isActive: true },
    select: { slug: true },
    orderBy: { slug: "asc" },
  });
  return pickSlugForDateKey(
    dateKey,
    rows.map((r) => r.slug),
  );
}

export type FootballPlayerAdminRow = {
  slug: string;
  nameEn: string;
  nameFa: string;
  nationality: string;
  nationalityCode: string;
  position: string;
  league: string;
  club: string;
  age: number;
  shirtNumber: number;
  isActive: boolean;
  updatedAt: string;
};

export function serializeAdminPlayer(row: FootballPlayer): FootballPlayerAdminRow {
  return {
    slug: row.slug,
    nameEn: row.nameEn,
    nameFa: row.nameFa,
    nationality: row.nationality,
    nationalityCode: row.nationalityCode,
    position: row.position,
    league: row.league,
    club: row.club,
    age: row.age,
    shirtNumber: row.shirtNumber,
    isActive: row.isActive,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type PlayerWriteInput = {
  slug: string;
  nameEn: string;
  nameFa: string;
  nationality: string;
  nationalityCode: string;
  position: string;
  league: string;
  club: string;
  age: number;
  shirtNumber: number;
  isActive: boolean;
};

export function normalizePlayerInput(
  input: PlayerWriteInput,
): PlayerWriteInput | { error: string } {
  const slug = input.slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!slug || slug.length < 2) return { error: "slug_invalid" };

  const position = input.position.trim().toUpperCase();
  if (!POSITIONS.has(position as MysteryPosition)) {
    return { error: "position_invalid" };
  }

  const nameEn = input.nameEn.trim();
  const nameFa = input.nameFa.trim();
  if (!nameEn || !nameFa) return { error: "name_required" };

  const nationality = input.nationality.trim();
  const nationalityCode = input.nationalityCode.trim().toUpperCase();
  const league = input.league.trim();
  const club = input.club.trim();
  if (!nationality || !nationalityCode || !league || !club) {
    return { error: "fields_required" };
  }

  const age = Math.round(input.age);
  const shirtNumber = Math.round(input.shirtNumber);
  if (age < 15 || age > 55) return { error: "age_invalid" };
  if (shirtNumber < 0 || shirtNumber > 99) return { error: "shirt_invalid" };

  return {
    slug,
    nameEn,
    nameFa,
    nationality,
    nationalityCode,
    position,
    league,
    club,
    age,
    shirtNumber,
    isActive: Boolean(input.isActive),
  };
}

export type { Prisma };
