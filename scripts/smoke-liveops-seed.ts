/**
 * Seed Live-Ops smoke fixtures:
 * - FA-only exclusive bank (challengeOnly + locales:fa)
 * - Public second bank (EN+FA) for 2-bank scoped picker
 * - Challenge A: 1 bank (skip picker)
 * - Challenge B: 2 banks (scoped picker)
 *
 * Run: npx tsx scripts/smoke-liveops-seed.ts
 */
import "dotenv/config";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildLocalizedContent, computeContentHash } from "../lib/admin/content";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FA_SLUG = "smoke-fa-crown";
const PUBLIC_SLUG = "smoke-public-bank";
const CHALLENGE_1 = "smoke-blue-crown";
const CHALLENGE_2 = "smoke-two-banks";

function q(
  n: number,
  category: { id: string; nameEn: string; nameFa: string },
  tag: string,
) {
  const content = {
    en: {
      text: `[SMOKE ${tag}] Question ${n}?`,
      options: ["A", "B", "C", "D"],
    },
    fa: {
      text: `[اسموک ${tag}] سؤال ${n}؟`,
      options: ["الف", "ب", "ج", "د"],
    },
  };
  return {
    content,
    contentHash: computeContentHash(content),
    localized: buildLocalizedContent(content, category) as Prisma.InputJsonValue,
  };
}

async function ensureBank(params: {
  slug: string;
  nameEn: string;
  nameFa: string;
  icon: string;
  challengeOnly: boolean;
  locales: string[];
  count: number;
  tag: string;
}) {
  const cat = await prisma.category.upsert({
    where: { slug: params.slug },
    create: {
      slug: params.slug,
      nameEn: params.nameEn,
      nameFa: params.nameFa,
      icon: params.icon,
      isActive: true,
      challengeOnly: params.challengeOnly,
      locales: params.locales,
    },
    update: {
      nameEn: params.nameEn,
      nameFa: params.nameFa,
      icon: params.icon,
      isActive: true,
      challengeOnly: params.challengeOnly,
      locales: params.locales,
    },
  });

  const existing = await prisma.question.count({
    where: { categoryId: cat.id, status: "PUBLISHED" },
  });
  const need = Math.max(0, params.count - existing);
  for (let i = existing + 1; i <= existing + need; i++) {
    const built = q(i, cat, params.tag);
    await prisma.question.create({
      data: {
        type: "TEXT",
        content: built.localized,
        contentHash: built.contentHash,
        correctIndex: 0,
        difficulty: "EASY",
        categoryId: cat.id,
        status: "PUBLISHED",
        source: "smoke-liveops",
      },
    });
  }

  const published = await prisma.question.count({
    where: { categoryId: cat.id, status: "PUBLISHED" },
  });
  return { cat, published };
}

async function upsertChallenge(params: {
  slug: string;
  titleEn: string;
  titleFa: string;
  unlockCostCoins: number;
  targetScore: number;
  badgeSlug: string;
  badgeEmoji: string;
  categoryIds: string[];
}) {
  const challenge = await prisma.recordChallenge.upsert({
    where: { slug: params.slug },
    create: {
      slug: params.slug,
      titleEn: params.titleEn,
      titleFa: params.titleFa,
      descriptionEn: "Smoke-test Live-Ops challenge.",
      descriptionFa: "چالش تست Live-Ops.",
      unlockCostCoins: params.unlockCostCoins,
      targetScore: params.targetScore,
      rewardBadgeSlug: params.badgeSlug,
      rewardBadgeEmoji: params.badgeEmoji,
      isActive: true,
      startsAt: new Date(Date.now() - 60_000),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    update: {
      titleEn: params.titleEn,
      titleFa: params.titleFa,
      unlockCostCoins: params.unlockCostCoins,
      targetScore: params.targetScore,
      rewardBadgeSlug: params.badgeSlug,
      rewardBadgeEmoji: params.badgeEmoji,
      isActive: true,
      startsAt: new Date(Date.now() - 60_000),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.recordChallengeCategory.deleteMany({
    where: { challengeId: challenge.id },
  });
  await prisma.recordChallengeCategory.createMany({
    data: params.categoryIds.map((categoryId) => ({
      challengeId: challenge.id,
      categoryId,
    })),
  });

  return challenge;
}

async function main() {
  const faBank = await ensureBank({
    slug: FA_SLUG,
    nameEn: "Smoke FA Crown Bank",
    nameFa: "بانک تاج دودی",
    icon: "👑",
    challengeOnly: true,
    locales: ["fa"],
    count: 8,
    tag: "FA",
  });

  const publicBank = await ensureBank({
    slug: PUBLIC_SLUG,
    nameEn: "Smoke Public Bank",
    nameFa: "بانک عمومی دودی",
    icon: "⚽",
    challengeOnly: false,
    locales: ["en", "fa"],
    count: 8,
    tag: "PUB",
  });

  // Also mark Iranian league FA-only if present (product example).
  await prisma.category.updateMany({
    where: { slug: "iranian-league" },
    data: { locales: ["fa"] },
  });

  const oneBank = await upsertChallenge({
    slug: CHALLENGE_1,
    titleEn: "Smoke Blue Crown",
    titleFa: "تاج آبی دودی",
    unlockCostCoins: 0,
    targetScore: 1,
    badgeSlug: "smoke_blue_crown",
    badgeEmoji: "👑",
    categoryIds: [faBank.cat.id],
  });

  const twoBank = await upsertChallenge({
    slug: CHALLENGE_2,
    titleEn: "Smoke Two Banks",
    titleFa: "چالش دو بانکی",
    unlockCostCoins: 0,
    targetScore: 3,
    badgeSlug: "smoke_two_banks",
    badgeEmoji: "🏅",
    categoryIds: [faBank.cat.id, publicBank.cat.id],
  });

  // Fund a human club for unlock/play smoke (first club with a phone user).
  const club = await prisma.club.findFirst({
    where: { user: { phone: { not: null } } },
    include: { user: { select: { phone: true, id: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (club) {
    await prisma.club.update({
      where: { id: club.id },
      data: {
        coins: { set: Math.max(club.coins, 5_000) },
        stamina: { set: Math.max(club.stamina, 5) },
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        faBank: {
          id: faBank.cat.id,
          slug: faBank.cat.slug,
          published: faBank.published,
          locales: faBank.cat.locales,
          challengeOnly: faBank.cat.challengeOnly,
        },
        publicBank: {
          id: publicBank.cat.id,
          slug: publicBank.cat.slug,
          published: publicBank.published,
        },
        challengeOneBank: { id: oneBank.id, slug: oneBank.slug, targetScore: 1 },
        challengeTwoBanks: { id: twoBank.id, slug: twoBank.slug },
        testClub: club
          ? { id: club.id, phone: club.user.phone, userId: club.user.id }
          : null,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
