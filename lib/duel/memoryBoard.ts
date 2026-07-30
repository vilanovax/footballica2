import "server-only";

import { prisma } from "@/lib/prisma";
import { playerPhotoSrc } from "@/lib/players/photos";
import type { MemoryBoardJson, MemoryCard } from "@/lib/duel/memoryTypes";
export { parseMemoryBoard } from "@/lib/duel/memoryTypes";

/** ISO α-2 → regional-indicator flag emoji. */
export function flagEmojiFromCode(code: string): string {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "🏳️";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + c.charCodeAt(0) - 65, A + c.charCodeAt(1) - 65);
}

/** Deterministic mulberry32 PRNG from a string seed. */
export function seededRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

type PlayerRow = {
  slug: string;
  nameEn: string;
  nameFa: string;
  nationality: string;
  nationalityCode: string;
};

/**
 * Pick `pairCount` active players with distinct nationality codes, then
 * build a shuffled PLAYER↔COUNTRY board. Seed locks layout for both halves.
 */
export async function buildMemoryBoard(opts: {
  pairCount: number;
  seed: string;
}): Promise<MemoryBoardJson> {
  const pairCount = Math.max(2, Math.min(8, Math.round(opts.pairCount)));
  const seed = opts.seed;
  const rand = seededRng(seed);

  const pool = await prisma.footballPlayer.findMany({
    where: { isActive: true },
    select: {
      slug: true,
      nameEn: true,
      nameFa: true,
      nationality: true,
      nationalityCode: true,
    },
    take: 400,
  });

  const byNation = new Map<string, PlayerRow[]>();
  for (const p of pool) {
    const code = (p.nationalityCode || "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) continue;
    const list = byNation.get(code) ?? [];
    list.push({ ...p, nationalityCode: code });
    byNation.set(code, list);
  }

  const nations = shuffleInPlace([...byNation.keys()], rand);
  if (nations.length < pairCount) {
    throw new Error(
      `memory_board_insufficient_nations:${nations.length}<${pairCount}`,
    );
  }

  const picked: PlayerRow[] = [];
  for (const code of nations.slice(0, pairCount)) {
    const candidates = byNation.get(code)!;
    const player = candidates[Math.floor(rand() * candidates.length)]!;
    picked.push(player);
  }

  const cards: MemoryCard[] = [];
  for (const p of picked) {
    const pairKey = p.slug;
    cards.push({
      id: `${pairKey}-player`,
      pairKey,
      face: "PLAYER",
      ref: p.slug,
      labelEn: p.nameEn,
      labelFa: p.nameFa,
      art: playerPhotoSrc(p.slug),
    });
    cards.push({
      id: `${pairKey}-country`,
      pairKey,
      face: "COUNTRY",
      ref: p.nationalityCode,
      labelEn: p.nationality,
      labelFa: p.nationality,
      art: flagEmojiFromCode(p.nationalityCode),
    });
  }

  shuffleInPlace(cards, rand);

  return {
    version: 1,
    seed,
    pairCount,
    cards,
  };
}

