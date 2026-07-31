import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  Prisma,
  PrismaClient,
  type QuestionDifficulty,
} from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PENALTY_QUESTIONS } from "../lib/quiz/mock-questions";
import type { QuestionDifficulty as QuizDifficulty } from "../lib/quiz/types";
import { buildLocalizedContent, computeContentHash } from "../lib/admin/content";

// Prisma v7 requires a driver adapter to instantiate the client.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DIFFICULTY_TO_DB: Record<QuizDifficulty, QuestionDifficulty> = {
  easy: "EASY",
  medium: "MEDIUM",
  hard: "HARD",
};

type LocaleContent = { text: string; options: string[] };
type Category = { id: string; nameEn: string; nameFa: string };

/** Shape of each entry in prisma/seeds/real-questions.json. */
type RealQuestion = {
  categorySlug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  correctIndex: number;
  source?: string;
  isTemporal?: boolean;
  content: { en: LocaleContent; fa: LocaleContent };
  explanation?: { en: string; fa: string } | null;
};

/** Primary content buckets. `general` keeps the original penalty mocks. */
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

/**
 * Idempotent upsert keyed by the content fingerprint. Play-derived stats
 * (eloRating / timesServed / timesCorrect) are seeded only on CREATE so
 * re-running the seed never wipes real gameplay signal.
 */
async function upsertQuestion(params: {
  content: { en: LocaleContent; fa: LocaleContent };
  correctIndex: number;
  difficulty: QuestionDifficulty;
  category: Category;
  source: string;
  isTemporal: boolean;
  explanation?: { en: string; fa: string } | null;
}) {
  const contentHash = computeContentHash(params.content);
  const localized = buildLocalizedContent(
    params.content,
    params.category,
  ) as Prisma.InputJsonValue;

  const explanation =
    params.explanation &&
    (params.explanation.en.trim() || params.explanation.fa.trim())
      ? {
          en: params.explanation.en.trim(),
          fa: params.explanation.fa.trim(),
        }
      : null;

  const shared = {
    type: "TEXT" as const,
    status: "PUBLISHED" as const,
    content: localized,
    correctIndex: params.correctIndex,
    difficulty: params.difficulty,
    source: params.source,
    isTemporal: params.isTemporal,
    categoryId: params.category.id,
    explanation: (explanation ??
      Prisma.DbNull) as Prisma.InputJsonValue | typeof Prisma.DbNull,
  };

  const row = await prisma.question.upsert({
    where: { contentHash },
    update: shared,
    create: {
      ...shared,
      contentHash,
      eloRating: 1500,
      timesServed: 0,
      timesCorrect: 0,
    },
    select: { id: true },
  });
  await prisma.questionCategory.createMany({
    data: [{ questionId: row.id, categoryId: params.category.id }],
    skipDuplicates: true,
  });
}

async function main() {
  // 1. Ensure every primary category exists (idempotent by unique slug).
  const categories = new Map<string, Category>();
  for (const def of CATEGORY_DEFS) {
    const c = await prisma.category.upsert({
      where: { slug: def.slug },
      update: { nameEn: def.nameEn, nameFa: def.nameFa, icon: def.icon },
      create: def,
      select: { id: true, slug: true, nameEn: true, nameFa: true },
    });
    categories.set(c.slug, c);
  }

  // 2. Keep the original penalty mocks in `general` (stable ids preserve any
  //    references), now enriched with production metadata + a content hash.
  const general = categories.get("general")!;
  for (const q of PENALTY_QUESTIONS) {
    const content = q.content as unknown as {
      en: LocaleContent;
      fa: LocaleContent;
    };
    const contentHash = computeContentHash(content);
    const shared = {
      type: "TEXT" as const,
      status: "PUBLISHED" as const,
      content: q.content as unknown as Prisma.InputJsonValue,
      correctIndex: q.correctIndex,
      difficulty: DIFFICULTY_TO_DB[q.difficulty],
      source: "MOCK_V1",
      isTemporal: false,
      categoryId: general.id,
      contentHash,
    };
    await prisma.question.upsert({
      where: { id: q.id },
      update: shared,
      create: {
        id: q.id,
        ...shared,
        eloRating: 1500,
        timesServed: 0,
        timesCorrect: 0,
      },
    });
    await prisma.questionCategory.createMany({
      data: [{ questionId: q.id, categoryId: general.id }],
      skipDuplicates: true,
    });
  }

  // 3. Bulk-load the curated real questions from JSON.
  const file = join(process.cwd(), "prisma", "seeds", "real-questions.json");
  const real = JSON.parse(readFileSync(file, "utf8")) as RealQuestion[];

  let inserted = 0;
  for (const q of real) {
    const category = categories.get(q.categorySlug);
    if (!category) {
      console.warn(`Skipping question — unknown category "${q.categorySlug}".`);
      continue;
    }
    await upsertQuestion({
      content: q.content,
      correctIndex: q.correctIndex,
      difficulty: q.difficulty,
      category,
      source: q.source ?? "SEED_V1",
      isTemporal: q.isTemporal ?? false,
      explanation: q.explanation ?? null,
    });
    inserted++;
  }

  const [total, published] = await Promise.all([
    prisma.question.count(),
    prisma.question.count({ where: { status: "PUBLISHED" } }),
  ]);

  // 4. LiveOps mission batches (idempotent by unique batchIndex).
  await seedMissionBatches();

  console.log(
    `Seed complete: ${CATEGORY_DEFS.length} categories, ` +
      `${PENALTY_QUESTIONS.length} mocks + ${inserted} real questions upserted ` +
      `(bank total: ${total}, published: ${published}).`,
  );
}

/** Two starter batches × 3 missions — safe to re-run. */
async function seedMissionBatches() {
  type MissionSeed = {
    titleEn: string;
    titleFa: string;
    objectiveType:
      | "SCORE_GOALS"
      | "PLAY_MATCHES"
      | "WIN_MATCHES"
      | "PERFECT_COMBO"
      | "PLAY_DUEL"
      | "WIN_DUEL";
    targetValue: number;
    rewardCoins: number;
    rewardXp: number;
    sortOrder: number;
  };

  const batches: {
    batchIndex: number;
    chestCoins: number;
    chestXp: number;
    missions: MissionSeed[];
  }[] = [
    {
      batchIndex: 1,
      chestCoins: 150,
      chestXp: 40,
      missions: [
        {
          titleEn: "Score 5 goals",
          titleFa: "۵ گل بزن",
          objectiveType: "SCORE_GOALS",
          targetValue: 5,
          rewardCoins: 20,
          rewardXp: 5,
          sortOrder: 0,
        },
        {
          titleEn: "Play 2 matches",
          titleFa: "۲ مسابقه بازی کن",
          objectiveType: "PLAY_MATCHES",
          targetValue: 2,
          rewardCoins: 15,
          rewardXp: 5,
          sortOrder: 1,
        },
        {
          titleEn: "Win 1 match",
          titleFa: "۱ برد بگیر",
          objectiveType: "WIN_MATCHES",
          targetValue: 1,
          rewardCoins: 25,
          rewardXp: 10,
          sortOrder: 2,
        },
      ],
    },
    {
      batchIndex: 2,
      chestCoins: 300,
      chestXp: 80,
      missions: [
        {
          titleEn: "Score 15 goals",
          titleFa: "۱۵ گل بزن",
          objectiveType: "SCORE_GOALS",
          targetValue: 15,
          rewardCoins: 40,
          rewardXp: 15,
          sortOrder: 0,
        },
        {
          titleEn: "Win 3 matches",
          titleFa: "۳ برد بگیر",
          objectiveType: "WIN_MATCHES",
          targetValue: 3,
          rewardCoins: 50,
          rewardXp: 20,
          sortOrder: 1,
        },
        {
          titleEn: "Play 1 Draft Duel",
          titleFa: "۱ نبرد نوبتی بازی کن",
          objectiveType: "PLAY_DUEL",
          targetValue: 1,
          rewardCoins: 40,
          rewardXp: 15,
          sortOrder: 2,
        },
      ],
    },
  ];

  for (const def of batches) {
    const batch = await prisma.missionBatch.upsert({
      where: { batchIndex: def.batchIndex },
      update: {
        chestCoins: def.chestCoins,
        chestXp: def.chestXp,
        isActive: true,
      },
      create: {
        batchIndex: def.batchIndex,
        chestCoins: def.chestCoins,
        chestXp: def.chestXp,
        isActive: true,
      },
    });

    const existing = await prisma.mission.findMany({
      where: { batchId: batch.id },
      select: { id: true, sortOrder: true },
    });
    const byOrder = new Map(existing.map((m) => [m.sortOrder, m.id]));

    for (const m of def.missions) {
      const id = byOrder.get(m.sortOrder);
      if (id) {
        await prisma.mission.update({
          where: { id },
          data: {
            titleEn: m.titleEn,
            titleFa: m.titleFa,
            objectiveType: m.objectiveType,
            targetValue: m.targetValue,
            rewardCoins: m.rewardCoins,
            rewardXp: m.rewardXp,
          },
        });
      } else {
        await prisma.mission.create({
          data: {
            batchId: batch.id,
            titleEn: m.titleEn,
            titleFa: m.titleFa,
            objectiveType: m.objectiveType,
            targetValue: m.targetValue,
            rewardCoins: m.rewardCoins,
            rewardXp: m.rewardXp,
            sortOrder: m.sortOrder,
          },
        });
      }
    }
  }

  console.log(`Mission batches seeded: ${batches.length} batches.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
