/**
 * End-to-end smoke: human vs bot Draft Duel — R1 QUIZ → R2 MEMORY.
 * CLI-safe (no server-only imports).
 *
 *   npx tsx scripts/smoke-duel-memory.ts
 */

import { config } from "dotenv";
config({ path: ".env" });

import { PrismaClient, type Prisma } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { playerPhotoSrc } from "../lib/players/photos";
import {
  parseMemoryBoard,
  type MemoryBoardJson,
  type MemoryCard,
} from "../lib/duel/memoryTypes";
import { gradeMemoryAttempt } from "../lib/duel/memoryGrade";
import { resolveDuelWinner, tallyRoundWins } from "../lib/duel/scoring";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

function flagEmojiFromCode(code: string): string {
  const c = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "🏳️";
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + c.charCodeAt(0) - 65,
    A + c.charCodeAt(1) - 65,
  );
}

function seededRng(seed: string): () => number {
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

async function buildBoard(
  prisma: PrismaClient,
  pairCount: number,
  seed: string,
): Promise<MemoryBoardJson> {
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
  const byNation = new Map<string, typeof pool>();
  for (const p of pool) {
    const code = (p.nationalityCode || "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) continue;
    const list = byNation.get(code) ?? [];
    list.push({ ...p, nationalityCode: code });
    byNation.set(code, list);
  }
  const nations = shuffleInPlace([...byNation.keys()], rand);
  assert(nations.length >= pairCount, `nations ${nations.length}<${pairCount}`);

  const cards: MemoryCard[] = [];
  for (const code of nations.slice(0, pairCount)) {
    const candidates = byNation.get(code)!;
    const p = candidates[Math.floor(rand() * candidates.length)]!;
    cards.push({
      id: `${p.slug}-player`,
      pairKey: p.slug,
      face: "PLAYER",
      ref: p.slug,
      labelEn: p.nameEn,
      labelFa: p.nameFa,
      art: playerPhotoSrc(p.slug),
    });
    cards.push({
      id: `${p.slug}-country`,
      pairKey: p.slug,
      face: "COUNTRY",
      ref: p.nationalityCode,
      labelEn: p.nationality,
      labelFa: p.nationality,
      art: flagEmojiFromCode(p.nationalityCode),
    });
  }
  shuffleInPlace(cards, rand);
  return { version: 1, seed, pairCount, cards };
}

function fabricateMemory(board: MemoryBoardJson, pairs: number) {
  const byPair = new Map<string, { a?: string; b?: string }>();
  for (const c of board.cards) {
    const slot = byPair.get(c.pairKey) ?? {};
    if (c.face === "PLAYER") slot.a = c.id;
    else slot.b = c.id;
    byPair.set(c.pairKey, slot);
  }
  const keys = [...byPair.keys()];
  const matches = [];
  let atMs = 1000;
  for (let i = 0; i < pairs; i++) {
    const key = keys[i]!;
    const p = byPair.get(key)!;
    matches.push({ cardA: p.a!, cardB: p.b!, pairKey: key, atMs });
    atMs += 2000;
  }
  return {
    version: 1 as const,
    kind: "MEMORY" as const,
    pairsFound: matches.length,
    pairCount: board.pairCount,
    matches,
    flips: matches.flatMap((m) => [
      { cardId: m.cardA, atMs: m.atMs - 200 },
      { cardId: m.cardB, atMs: m.atMs - 100 },
    ]),
    durationMs: 12000,
    timedOut: false,
  };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const pool = new pg.Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  let duelId: string | null = null;

  try {
    const nationCount = (
      await prisma.footballPlayer.findMany({
        where: { isActive: true },
        distinct: ["nationalityCode"],
        select: { nationalityCode: true },
      })
    ).length;
    assert(nationCount >= 8, `need ≥8 nations, got ${nationCount}`);

    const human = await prisma.user.findFirst({
      where: { isBot: false, club: { isNot: null } },
      include: { club: true },
      orderBy: { createdAt: "desc" },
    });
    assert(human, "no human user with club");

    const bot = await prisma.user.findFirst({
      where: { isBot: true, botEnabled: true },
      orderBy: { createdAt: "desc" },
    });
    assert(bot, "no enabled bot");

    const published = await prisma.question.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, correctIndex: true, categoryId: true },
      take: 5,
    });
    assert(published.length >= 5, "need ≥5 published questions");

    const qIds = published.map((q) => q.id);
    const catId = published[0]!.categoryId;
    const now = new Date();
    const attackLog = published.map((q) => ({
      questionId: q.id,
      selectedIndex: q.correctIndex,
      correct: true,
      ms: 1200,
    }));

    const duel = await prisma.duelMatch.create({
      data: {
        status: "WAITING_B",
        challengerId: human.id,
        opponentId: bot.id,
        isBotOpponent: true,
        turnUserId: bot.id,
        turnDeadlineAt: new Date(now.getTime() + 86_400_000),
        botPlayAt: new Date(now.getTime() - 1000),
        challengerCorrect: 5,
        opponentCorrect: 0,
        rounds: {
          create: {
            roundNumber: 1,
            roundType: "QUIZ",
            attackerId: human.id,
            draftOptionIds: [catId],
            categoryId: catId,
            questionIds: qIds,
            attackAnswers: attackLog,
            attackCorrect: 5,
            attackSubmittedAt: now,
          },
        },
      },
    });
    duelId = duel.id;
    console.log(`[smoke] duel ${duelId}`);

    // ── Bot: defend R1 + MEMORY attack R2 (mirrors lib/duel/bot.ts) ──
    const seed = `${duelId}-r2`;
    const board = await buildBoard(prisma, 8, seed);
    const botMem = fabricateMemory(board, 5);
    const defenseLog = published.map((q) => ({
      questionId: q.id,
      selectedIndex: q.correctIndex,
      correct: true,
      ms: 900,
    }));
    const defenseCorrect = 5;
    const attackCorrect = botMem.pairsFound;

    await prisma.$transaction(async (tx) => {
      const r1 = await tx.duelRound.findFirstOrThrow({
        where: { duelId: duelId!, roundNumber: 1 },
      });
      await tx.duelRound.update({
        where: { id: r1.id },
        data: {
          defenseAnswers: defenseLog,
          defenseCorrect,
          defenseSubmittedAt: now,
        },
      });
      await tx.duelRound.create({
        data: {
          duelId: duelId!,
          roundNumber: 2,
          roundType: "MEMORY",
          attackerId: bot.id,
          draftOptionIds: [],
          boardJson: board as unknown as Prisma.InputJsonValue,
          attackAnswers: botMem as unknown as Prisma.InputJsonValue,
          attackCorrect,
          attackSubmittedAt: now,
          attackStartedAt: now,
        },
      });
      await tx.duelMatch.update({
        where: { id: duelId! },
        data: {
          status: "WAITING_A",
          turnUserId: human.id,
          botPlayAt: null,
          challengerCorrect: 5,
          opponentCorrect: defenseCorrect + attackCorrect,
        },
      });
    });

    const afterBot = await prisma.duelMatch.findUniqueOrThrow({
      where: { id: duelId },
      include: { rounds: { orderBy: { roundNumber: "asc" } } },
    });
    assert(afterBot.status === "WAITING_A", `status=${afterBot.status}`);
    const r2 = afterBot.rounds.find((r) => r.roundNumber === 2)!;
    assert(r2.roundType === "MEMORY", `r2=${r2.roundType}`);
    const parsed = parseMemoryBoard(r2.boardJson);
    assert(parsed, "boardJson bad");
    assert(parsed.cards.length === 16, `cards=${parsed.cards.length}`);

    const rebuilt = await buildBoard(prisma, 8, seed);
    assert(
      JSON.stringify(rebuilt.cards.map((c) => c.id)) ===
        JSON.stringify(parsed.cards.map((c) => c.id)),
      "board not deterministic",
    );

    // Human defend — one real pair
    const pk = parsed.cards[0]!.pairKey;
    const pair = parsed.cards.filter((c) => c.pairKey === pk);
    const defendLog = gradeMemoryAttempt(parsed, {
      flips: [
        { cardId: pair[0]!.id, atMs: 400 },
        { cardId: pair[1]!.id, atMs: 800 },
      ],
      matches: [{ cardA: pair[0]!.id, cardB: pair[1]!.id, atMs: 900 }],
      durationMs: 5000,
    });
    assert(defendLog.pairsFound === 1, `pairs=${defendLog.pairsFound}`);

    const forged = gradeMemoryAttempt(parsed, {
      flips: [],
      matches: [
        { cardA: parsed.cards[0]!.id, cardB: parsed.cards[2]!.id, atMs: 1 },
      ],
      durationMs: 100,
    });
    assert(forged.pairsFound === 0, "forged match scored");

    const humanDefend = defendLog.pairsFound;
    const challengerCorrect = afterBot.challengerCorrect + humanDefend;
    const opponentCorrect = afterBot.opponentCorrect;
    const roundWins = tallyRoundWins(
      afterBot.rounds.map((r) => ({
        attackerId: r.attackerId,
        attackCorrect: r.attackCorrect,
        defenseCorrect: r.id === r2.id ? humanDefend : r.defenseCorrect,
        complete: true,
      })),
      afterBot.challengerId,
    );
    const winnerId = resolveDuelWinner({
      challengerId: afterBot.challengerId,
      opponentId: afterBot.opponentId,
      challengerCorrect,
      opponentCorrect,
      challengerRoundWins: roundWins.challenger,
      opponentRoundWins: roundWins.opponent,
    });

    await prisma.$transaction(async (tx) => {
      await tx.duelRound.update({
        where: { id: r2.id },
        data: {
          defenseAnswers: defendLog as unknown as Prisma.InputJsonValue,
          defenseCorrect: humanDefend,
          defenseSubmittedAt: new Date(),
          defenseStartedAt: new Date(),
        },
      });
      await tx.duelMatch.update({
        where: { id: duelId! },
        data: {
          status: "COMPLETED",
          finishedAt: new Date(),
          turnUserId: null,
          challengerCorrect,
          opponentCorrect,
          winnerId,
        },
      });
    });

    const done = await prisma.duelMatch.findUniqueOrThrow({
      where: { id: duelId },
      include: { rounds: true },
    });
    const mem = done.rounds.find((r) => r.roundNumber === 2)!;
    assert(done.status === "COMPLETED", "not completed");
    assert(mem.roundType === "MEMORY", "r2 not MEMORY");
    assert(mem.defenseCorrect === 1, "defend score");

    console.log("[smoke] OK");
    console.log(
      JSON.stringify(
        {
          status: done.status,
          r2Type: mem.roundType,
          pairCount: parsed.pairCount,
          botPairs: mem.attackCorrect,
          humanPairs: mem.defenseCorrect,
          sameBoard: true,
          forgedRejected: true,
        },
        null,
        2,
      ),
    );
  } finally {
    if (duelId) {
      await prisma.duelMatch.delete({ where: { id: duelId } }).catch(() => {});
      console.log(`[smoke] cleaned ${duelId}`);
    }
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[smoke] FAIL", err);
  process.exit(1);
});
