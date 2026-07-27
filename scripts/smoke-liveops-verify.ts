/**
 * Prisma-level smoke for Live-Ops category scoping (no Next server-only imports).
 * Run after smoke-liveops-seed.ts:
 *   npx tsx scripts/smoke-liveops-verify.ts
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FA_SLUG = "smoke-fa-crown";
const PUBLIC_SLUG = "smoke-public-bank";
const CHALLENGE_1 = "smoke-blue-crown";
const CHALLENGE_2 = "smoke-two-banks";
const MIN_Q = 5;

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

async function eligible(params: {
  locale: "en" | "fa";
  challengeOnly: boolean;
}) {
  const cats = await prisma.category.findMany({
    where: {
      isActive: true,
      challengeOnly: params.challengeOnly,
      locales: { has: params.locale },
    },
    include: {
      _count: {
        select: { questions: { where: { status: "PUBLISHED" } } },
      },
    },
  });
  return cats.filter((c) => c._count.questions >= MIN_Q);
}

async function challengeBanks(
  challengeId: string,
  locale: "en" | "fa",
) {
  const links = await prisma.recordChallengeCategory.findMany({
    where: { challengeId },
    select: { categoryId: true },
  });
  if (links.length === 0) {
    return eligible({ locale, challengeOnly: false });
  }
  const cats = await prisma.category.findMany({
    where: {
      id: { in: links.map((l) => l.categoryId) },
      isActive: true,
      locales: { has: locale },
    },
    include: {
      _count: {
        select: { questions: { where: { status: "PUBLISHED" } } },
      },
    },
  });
  return cats.filter((c) => c._count.questions >= MIN_Q);
}

async function main() {
  const faCat = await prisma.category.findUniqueOrThrow({
    where: { slug: FA_SLUG },
  });
  const publicCat = await prisma.category.findUniqueOrThrow({
    where: { slug: PUBLIC_SLUG },
  });
  const c1 = await prisma.recordChallenge.findUniqueOrThrow({
    where: { slug: CHALLENGE_1 },
  });
  const c2 = await prisma.recordChallenge.findUniqueOrThrow({
    where: { slug: CHALLENGE_2 },
  });

  const publicEn = await eligible({ locale: "en", challengeOnly: false });
  const publicFa = await eligible({ locale: "fa", challengeOnly: false });
  assert(
    !publicEn.some((c) => c.id === faCat.id),
    "FA-only challenge bank leaked into EN public Survival",
  );
  assert(
    !publicFa.some((c) => c.id === faCat.id),
    "challengeOnly bank leaked into FA public Survival",
  );
  assert(
    publicFa.some((c) => c.id === publicCat.id) ||
      publicEn.some((c) => c.id === publicCat.id),
    "public smoke bank missing from free pickers",
  );

  const c1En = await challengeBanks(c1.id, "en");
  const c1Fa = await challengeBanks(c1.id, "fa");
  assert(c1En.length === 0, "1-bank FA challenge should be empty for EN");
  assert(c1Fa.length === 1, `expected 1 FA bank, got ${c1Fa.length}`);
  assert(c1Fa[0]!.id === faCat.id, "1-bank challenge wrong category");

  const c2Fa = await challengeBanks(c2.id, "fa");
  const c2En = await challengeBanks(c2.id, "en");
  assert(c2Fa.length === 2, `expected 2 FA banks, got ${c2Fa.length}`);
  assert(c2En.length === 1, `expected 1 EN bank, got ${c2En.length}`);
  assert(c2En[0]!.id === publicCat.id, "EN 2-bank should be public bank only");

  const skip = c1Fa.length === 1;
  assert(skip, "auto-skip condition failed");

  // Simulate unlock + conquer ledger for test club (DB path settle uses).
  const club = await prisma.club.findFirst({
    where: { user: { phone: "09121234567" } },
  });
  assert(club, "test club 09121234567 missing");

  await prisma.clubChallengeAccess.upsert({
    where: {
      clubId_challengeId: { clubId: club!.id, challengeId: c1.id },
    },
    create: {
      clubId: club!.id,
      challengeId: c1.id,
      coinsSpent: 0,
    },
    update: {},
  });

  const run = await prisma.clubChallengeRun.upsert({
    where: {
      clubId_challengeId: { clubId: club!.id, challengeId: c1.id },
    },
    create: {
      clubId: club!.id,
      challengeId: c1.id,
      bestScore: 1,
      attempts: 1,
      conqueredAt: new Date(),
      badgeGranted: true,
    },
    update: {
      bestScore: 1,
      attempts: { increment: 1 },
      conqueredAt: new Date(),
      badgeGranted: true,
    },
  });

  await prisma.clubBadge.upsert({
    where: {
      clubId_badgeSlug: { clubId: club!.id, badgeSlug: "smoke_blue_crown" },
    },
    create: {
      clubId: club!.id,
      badgeSlug: "smoke_blue_crown",
      sourceChallengeId: c1.id,
    },
    update: {
      sourceChallengeId: c1.id,
    },
  });

  const badge = await prisma.clubBadge.findUnique({
    where: {
      clubId_badgeSlug: { clubId: club!.id, badgeSlug: "smoke_blue_crown" },
    },
  });
  assert(badge?.sourceChallengeId === c1.id, "badge not linked to challenge");
  assert(run.conqueredAt != null, "run not conquered");
  assert(run.badgeGranted, "badgeGranted flag false");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: {
          publicHidesChallengeOnly: true,
          oneBankFaSkip: { count: c1Fa.length, skip },
          oneBankEnEmpty: c1En.length,
          twoBankFa: c2Fa.map((c) => c.slug),
          twoBankEn: c2En.map((c) => c.slug),
          unlockedOneBank: true,
          conqueredWithBadge: true,
          badgeSlug: badge?.badgeSlug,
        },
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
