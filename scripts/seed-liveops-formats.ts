/**
 * Live-Ops content seed:
 * - PUBLISHED CAREER_PATH + HIGHER_LOWER questions (idempotent by contentHash)
 * - Mystery puzzles for today (Tehran) + next N days
 *
 * Run: npm run seed:liveops-formats
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildLocalizedContent, computeContentHash } from "../lib/admin/content";
import { MYSTERY_MAX_GUESSES } from "../lib/mystery/types";
import { SEED_FOOTBALL_PLAYERS } from "../lib/mystery/seedCatalog";

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

/** Hand-picked rotation so nearby days don’t feel random/duplicate. */
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

type LocaleBlob = {
  text: string;
  options: string[];
  careerPath?: { steps: { name: string; logoUrl?: string | null }[] };
  higherLower?: {
    left: { name: string; imageUrl?: string | null };
    right: { name: string; imageUrl?: string | null };
    metricLabel: string;
  };
};

type FormatSeedQuestion = {
  type: "CAREER_PATH" | "HIGHER_LOWER" | "REVEAL_IMAGE";
  categorySlug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  correctIndex: number;
  source?: string;
  isTemporal?: boolean;
  mediaUrl?: string | null;
  content: { en: LocaleBlob; fa: LocaleBlob };
  explanation?: { en: string; fa: string } | null;
};

const CATEGORY_DEFS = [
  { slug: "general", nameEn: "General", nameFa: "عمومی", icon: "⚽️" },
  { slug: "world-cup", nameEn: "World Cup", nameFa: "جام جهانی", icon: "🏆" },
  {
    slug: "champions-league",
    nameEn: "Champions League",
    nameFa: "لیگ قهرمانان اروپا",
    icon: "⭐️",
  },
  {
    slug: "iranian-league",
    nameEn: "Iranian Football",
    nameFa: "فوتبال ایران",
    icon: "🇮🇷",
  },
] as const;

function addTehranDays(fromKey: string, offset: number): string {
  const base = new Date(`${fromKey}T12:00:00+03:30`);
  base.setTime(base.getTime() + offset * 86_400_000);
  return tehranDayKey(base);
}

async function ensureCategories() {
  const map = new Map<string, { id: string; nameEn: string; nameFa: string }>();
  for (const def of CATEGORY_DEFS) {
    const c = await prisma.category.upsert({
      where: { slug: def.slug },
      update: { nameEn: def.nameEn, nameFa: def.nameFa, icon: def.icon },
      create: { ...def, isActive: true },
      select: { id: true, slug: true, nameEn: true, nameFa: true },
    });
    map.set(c.slug, c);
  }
  return map;
}

async function upsertFormatQuestion(
  q: FormatSeedQuestion,
  category: { id: string; nameEn: string; nameFa: string },
) {
  const contentHash = computeContentHash(q.content);
  const localized = buildLocalizedContent(
    q.content,
    category,
  ) as Prisma.InputJsonValue;

  const explanation =
    q.explanation &&
    (q.explanation.en.trim() || q.explanation.fa.trim())
      ? {
          en: q.explanation.en.trim(),
          fa: q.explanation.fa.trim(),
        }
      : null;

  const shared = {
    type: q.type,
    status: "PUBLISHED" as const,
    content: localized,
    correctIndex: q.correctIndex,
    difficulty: q.difficulty,
    source: q.source ?? "LIVEOPS_FORMATS_V1",
    isTemporal: q.isTemporal ?? false,
    categoryId: category.id,
    mediaUrl: q.type === "REVEAL_IMAGE" ? (q.mediaUrl ?? null) : null,
    explanation: (explanation ??
      Prisma.DbNull) as Prisma.InputJsonValue | typeof Prisma.DbNull,
  };

  await prisma.question.upsert({
    where: { contentHash },
    update: shared,
    create: {
      ...shared,
      contentHash,
      eloRating: 1500,
      timesServed: 0,
      timesCorrect: 0,
    },
  });
}

async function seedFormatQuestions() {
  const categories = await ensureCategories();
  const file = join(process.cwd(), "prisma", "seeds", "format-questions.json");
  const rows = JSON.parse(readFileSync(file, "utf8")) as FormatSeedQuestion[];

  let n = 0;
  for (const q of rows) {
    const category = categories.get(q.categorySlug);
    if (!category) {
      console.warn(`Skip — unknown category "${q.categorySlug}"`);
      continue;
    }
    await upsertFormatQuestion(q, category);
    n++;
  }
  return n;
}

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
  const questions = await seedFormatQuestions();
  const puzzles = await seedMysterySchedule();

  const [career, higher, reveal, mysteryTotal] = await Promise.all([
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

  console.log(`Format questions upserted: ${questions}`);
  console.log(
    `Published bank — CAREER_PATH: ${career}, HIGHER_LOWER: ${higher}, REVEAL_IMAGE: ${reveal}`,
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
