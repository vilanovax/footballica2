import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { Prisma as PrismaNS } from "@/generated/prisma/client";
import { buildLocalizedContent, computeContentHash } from "@/lib/admin/content";

type Db = PrismaClient | Prisma.TransactionClient;

export const LIVEOPS_FORMAT_SOURCE = "LIVEOPS_FORMATS_V1";

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

export type FormatSeedQuestion = {
  type: "TEXT" | "IMAGE" | "CAREER_PATH" | "HIGHER_LOWER" | "REVEAL_IMAGE";
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

export function loadLiveopsFormatSeedFile(): FormatSeedQuestion[] {
  const file = join(process.cwd(), "prisma", "seeds", "format-questions.json");
  return JSON.parse(readFileSync(file, "utf8")) as FormatSeedQuestion[];
}

export async function ensureLiveopsCategories(db: Db) {
  const map = new Map<string, { id: string; nameEn: string; nameFa: string }>();
  for (const def of CATEGORY_DEFS) {
    const c = await db.category.upsert({
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
  db: Db,
  q: FormatSeedQuestion,
  category: { id: string; nameEn: string; nameFa: string },
) {
  const contentHash = computeContentHash(q.content);
  const localized = buildLocalizedContent(
    q.content,
    category,
  ) as Prisma.InputJsonValue;

  const explanation =
    q.explanation && (q.explanation.en.trim() || q.explanation.fa.trim())
      ? { en: q.explanation.en.trim(), fa: q.explanation.fa.trim() }
      : null;

  const needsMedia = q.type === "IMAGE" || q.type === "REVEAL_IMAGE";
  const shared = {
    type: q.type,
    status: "PUBLISHED" as const,
    content: localized,
    correctIndex: q.correctIndex,
    difficulty: q.difficulty,
    source: q.source ?? LIVEOPS_FORMAT_SOURCE,
    isTemporal: q.isTemporal ?? false,
    categoryId: category.id,
    mediaUrl: needsMedia ? (q.mediaUrl ?? null) : null,
    explanation: (explanation ??
      PrismaNS.DbNull) as Prisma.InputJsonValue | typeof PrismaNS.DbNull,
  };

  const row = await db.question.upsert({
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
  await db.questionCategory.createMany({
    data: [{ questionId: row.id, categoryId: category.id }],
    skipDuplicates: true,
  });
}

export type LiveopsFormatSyncStats = {
  upserted: number;
  skippedUnknownCategory: number;
  byType: Record<string, number>;
};

/** Idempotent upsert of prisma/seeds/format-questions.json into the live bank. */
export async function syncLiveopsFormatPack(
  db: Db,
): Promise<LiveopsFormatSyncStats> {
  const categories = await ensureLiveopsCategories(db);
  const rows = loadLiveopsFormatSeedFile();
  const byType: Record<string, number> = {};
  let upserted = 0;
  let skippedUnknownCategory = 0;

  for (const q of rows) {
    const category = categories.get(q.categorySlug);
    if (!category) {
      skippedUnknownCategory += 1;
      continue;
    }
    await upsertFormatQuestion(db, q, category);
    upserted += 1;
    byType[q.type] = (byType[q.type] ?? 0) + 1;
  }

  return { upserted, skippedUnknownCategory, byType };
}

export async function countPublishedFormats(db: Db) {
  const types = [
    "IMAGE",
    "CAREER_PATH",
    "HIGHER_LOWER",
    "REVEAL_IMAGE",
  ] as const;
  const counts = await Promise.all(
    types.map((type) =>
      db.question.count({ where: { type, status: "PUBLISHED" } }),
    ),
  );
  return Object.fromEntries(
    types.map((t, i) => [t, counts[i] ?? 0]),
  ) as Record<(typeof types)[number], number>;
}
