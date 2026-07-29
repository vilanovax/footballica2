/**
 * Live-Ops content seed:
 * - PUBLISHED visual format questions (idempotent by contentHash)
 * - Mystery puzzles for today (Tehran) + next N days
 *
 * Run: npm run seed:liveops-formats
 *
 * Note: do not import lib/* modules that pull in `server-only` (e.g. mystery/jobs).
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { MYSTERY_MAX_GUESSES } from "../lib/mystery/types";
import { SEED_FOOTBALL_PLAYERS } from "../lib/mystery/seedCatalog";
import { syncLiveopsFormatPack } from "../lib/admin/liveopsFormatPack";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DAYS_AHEAD = 7;

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function tehranDayKey(date: Date = new Date()): string {
  return dayKeyFormatter.format(date);
}

function addTehranDays(fromKey: string, offset: number): string {
  const base = new Date(`${fromKey}T12:00:00+03:30`);
  base.setTime(base.getTime() + offset * 86_400_000);
  return tehranDayKey(base);
}

const MYSTERY_ROTATION = [
  "messi",
  "ronaldo",
  "mbappe",
  "salah",
  "taremi",
  "haaland",
  "bellingham",
  "neymar",
  "jahanbakhsh",
  "lewandowski",
  "vinicius",
  "yamal",
] as const;

async function ensurePlayerCatalog() {
  await prisma.footballPlayer.createMany({
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
}

async function seedMysterySchedule() {
  await ensurePlayerCatalog();

  const active = await prisma.footballPlayer.findMany({
    where: { isActive: true },
    select: { slug: true },
  });
  const activeSet = new Set(active.map((p) => p.slug));
  const fallback =
    active[0]?.slug ?? SEED_FOOTBALL_PLAYERS[0]?.id ?? "messi";

  const today = tehranDayKey();
  const scheduled: { dateKey: string; slug: string }[] = [];

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const dateKey = addTehranDays(today, i);
    const preferred = MYSTERY_ROTATION[i % MYSTERY_ROTATION.length]!;
    const slug = activeSet.has(preferred) ? preferred : fallback;

    await prisma.dailyMysteryPuzzle.upsert({
      where: { dateKey },
      create: {
        dateKey,
        targetPlayerId: slug,
        config: { maxGuesses: MYSTERY_MAX_GUESSES },
      },
      update: {
        targetPlayerId: slug,
        config: { maxGuesses: MYSTERY_MAX_GUESSES },
      },
    });
    scheduled.push({ dateKey, slug });
  }

  return scheduled;
}

async function main() {
  const formatStats = await syncLiveopsFormatPack(prisma);
  const puzzles = await seedMysterySchedule();

  const [image, career, higher, reveal, mysteryTotal] = await Promise.all([
    prisma.question.count({ where: { type: "IMAGE", status: "PUBLISHED" } }),
    prisma.question.count({
      where: { type: "CAREER_PATH", status: "PUBLISHED" },
    }),
    prisma.question.count({
      where: { type: "HIGHER_LOWER", status: "PUBLISHED" },
    }),
    prisma.question.count({
      where: { type: "REVEAL_IMAGE", status: "PUBLISHED" },
    }),
    prisma.dailyMysteryPuzzle.count(),
  ]);

  console.log(`Format questions upserted: ${formatStats.upserted}`);
  console.log(`  by type: ${JSON.stringify(formatStats.byType)}`);
  console.log(
    `Published bank — IMAGE: ${image}, CAREER_PATH: ${career}, HIGHER_LOWER: ${higher}, REVEAL_IMAGE: ${reveal}`,
  );
  console.log(`Mystery schedule (${DAYS_AHEAD} days from Tehran today):`);
  for (const p of puzzles) {
    console.log(`  ${p.dateKey} → ${p.slug}`);
  }
  console.log(`Mystery puzzles in DB: ${mysteryTotal}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("seed-liveops-formats failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
