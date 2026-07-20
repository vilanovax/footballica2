import "dotenv/config";
import {
  Prisma,
  PrismaClient,
  type QuestionDifficulty,
} from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PENALTY_QUESTIONS } from "../lib/quiz/mock-questions";
import type { QuestionDifficulty as QuizDifficulty } from "../lib/quiz/types";

// Prisma v7 requires a driver adapter to instantiate the client.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DIFFICULTY_TO_DB: Record<QuizDifficulty, QuestionDifficulty> = {
  easy: "EASY",
  medium: "MEDIUM",
  hard: "HARD",
};

/** Default bucket every mock question is filed under until re-categorized. */
const DEFAULT_CATEGORY = {
  slug: "general",
  nameEn: "General",
  nameFa: "عمومی",
  icon: "⚽️",
} as const;

async function main() {
  // 1. Ensure the default category exists (idempotent by unique slug).
  const category = await prisma.category.upsert({
    where: { slug: DEFAULT_CATEGORY.slug },
    update: {},
    create: DEFAULT_CATEGORY,
  });

  // 2. Upsert every mock question, mapping bilingual content into the JSON
  //    column and linking to the default category. Stable ids keep re-runs safe.
  for (const q of PENALTY_QUESTIONS) {
    const content = q.content as unknown as Prisma.InputJsonValue;
    const fields = {
      content,
      correctIndex: q.correctIndex,
      difficulty: DIFFICULTY_TO_DB[q.difficulty],
      type: "TEXT" as const,
      isActive: true,
      categoryId: category.id,
    };
    await prisma.question.upsert({
      where: { id: q.id },
      update: fields,
      create: { id: q.id, ...fields },
    });
  }

  const total = await prisma.question.count();
  console.log(
    `Seed complete: category "${category.slug}" + ${PENALTY_QUESTIONS.length} questions upserted (bank total: ${total}).`,
  );
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
