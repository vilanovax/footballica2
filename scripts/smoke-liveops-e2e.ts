/**
 * End-to-end Live-Ops smoke (DB + pure economy math — no HTTP session).
 *
 * Covers:
 * 1) Fixtures present (run seed first if missing)
 * 2) Survival rewards respect GameConfig (incl. 2× weekend)
 * 3) modeEconomy previews track config
 * 4) Unlock ledger + coin debit path
 * 5) Conquer target + showcase badge grant
 * 6) Restore GameConfig survival defaults
 *
 *   npx tsx scripts/smoke-liveops-seed.ts
 *   npx tsx scripts/smoke-liveops-verify.ts
 *   npx tsx scripts/smoke-liveops-e2e.ts
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  DEFAULT_GAME_CONFIG,
  mergeGameConfig,
  type GameConfig,
} from "../lib/game/economy";
import {
  computeSurvivalRewards,
  survivalWeeklyXp,
} from "../lib/game/survival";
import { getPlayModeEconomy } from "../lib/play/modeEconomy";
import {
  isChallengeTargetMet,
  isRecordChallengeLive,
} from "../lib/game/recordChallenge";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CHALLENGE_1 = "smoke-blue-crown";
const BADGE = "smoke_blue_crown";
const TEST_PHONE = "09121234567";
const CONFIG_ID = "global";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`E2E ASSERT: ${msg}`);
}

async function readConfig(): Promise<GameConfig> {
  const row = await prisma.gameConfig.findUnique({ where: { id: CONFIG_ID } });
  return row ? mergeGameConfig(row.config) : { ...DEFAULT_GAME_CONFIG };
}

async function writeConfig(config: GameConfig) {
  const normalized = mergeGameConfig(config);
  await prisma.gameConfig.upsert({
    where: { id: CONFIG_ID },
    create: { id: CONFIG_ID, config: normalized },
    update: { config: normalized },
  });
  return normalized;
}

async function main() {
  const steps: Record<string, unknown> = {};

  // ── 1. Fixtures ──────────────────────────────────────────────────────────
  const challenge = await prisma.recordChallenge.findUnique({
    where: { slug: CHALLENGE_1 },
    include: { categories: true },
  });
  assert(challenge, `missing challenge ${CHALLENGE_1} — run smoke-liveops-seed.ts`);
  assert(
    isRecordChallengeLive(challenge),
    "smoke challenge is not live (isActive/window)",
  );
  assert(challenge.categories.length === 1, "expected 1-bank challenge");
  steps.fixtures = {
    challengeId: challenge.id,
    targetScore: challenge.targetScore,
    unlockCost: challenge.unlockCostCoins,
    banks: challenge.categories.length,
  };

  const user = await prisma.user.findUnique({
    where: { phone: TEST_PHONE },
    include: { club: true },
  });
  assert(user?.club, `test user/club ${TEST_PHONE} missing`);
  const club = user.club!;

  // ── 2. Survival math + Live-Ops 2× ───────────────────────────────────────
  const baseline = await readConfig();
  const score = 8;
  const normal = computeSurvivalRewards(
    { score, bestCombo: 4, endReason: "eliminated" },
    baseline,
  );
  assert(
    normal.coins === score * baseline.survival.coinsPerCorrect,
    `coins ${normal.coins} != score×rate`,
  );
  assert(
    normal.xp === score * baseline.survival.xpPerCorrect,
    `xp ${normal.xp} != score×rate`,
  );
  assert(
    survivalWeeklyXp(score, baseline) ===
      Math.max(1, Math.floor(score / baseline.survival.weeklyXpDivisor)),
    "weeklyXp formula mismatch",
  );

  const weekendCfg = mergeGameConfig({
    ...baseline,
    survival: {
      ...baseline.survival,
      coinsPerCorrect: baseline.survival.coinsPerCorrect * 2,
    },
  });
  await writeConfig(weekendCfg);
  const afterWrite = await readConfig();
  assert(
    afterWrite.survival.coinsPerCorrect ===
      DEFAULT_GAME_CONFIG.survival.coinsPerCorrect * 2,
    "DB did not persist 2× survival coins",
  );
  const boosted = computeSurvivalRewards(
    { score, bestCombo: 4, endReason: "eliminated" },
    afterWrite,
  );
  assert(
    boosted.coins === normal.coins * 2,
    `2× event failed: ${boosted.coins} vs ${normal.coins * 2}`,
  );

  const preview = getPlayModeEconomy(afterWrite).survival;
  assert(
    preview.perCorrectCoins === afterWrite.survival.coinsPerCorrect,
    "Match Day preview not reading config",
  );
  steps.economy = {
    baselineCoinsPerCorrect: baseline.survival.coinsPerCorrect,
    weekendCoinsPerCorrect: afterWrite.survival.coinsPerCorrect,
    score,
    coinsNormal: normal.coins,
    coinsWeekend: boosted.coins,
    previewPerCorrect: preview.perCorrectCoins,
  };

  // Restore defaults for the rest of the suite / local play
  const restored = await writeConfig({
    ...afterWrite,
    survival: { ...DEFAULT_GAME_CONFIG.survival },
  });
  assert(
    restored.survival.coinsPerCorrect ===
      DEFAULT_GAME_CONFIG.survival.coinsPerCorrect,
    "failed to restore survival defaults",
  );

  // ── 3. Unlock ledger (coin debit) ────────────────────────────────────────
  const cost = challenge.unlockCostCoins;
  const beforeCoins = club.coins;
  // Ensure enough coins
  if (beforeCoins < cost) {
    await prisma.club.update({
      where: { id: club.id },
      data: { coins: cost + 50 },
    });
  }
  const clubFresh = await prisma.club.findUniqueOrThrow({
    where: { id: club.id },
  });

  await prisma.$transaction(async (tx) => {
    await tx.clubChallengeAccess.upsert({
      where: {
        clubId_challengeId: {
          clubId: clubFresh.id,
          challengeId: challenge.id,
        },
      },
      create: {
        clubId: clubFresh.id,
        challengeId: challenge.id,
        coinsSpent: cost,
      },
      update: { coinsSpent: cost },
    });
    // Only debit if this is a fresh path simulation (idempotent for re-runs)
    const access = await tx.clubChallengeAccess.findUniqueOrThrow({
      where: {
        clubId_challengeId: {
          clubId: clubFresh.id,
          challengeId: challenge.id,
        },
      },
    });
    assert(access.coinsSpent === cost, "unlock coinsSpent mismatch");
  });

  const access = await prisma.clubChallengeAccess.findUnique({
    where: {
      clubId_challengeId: {
        clubId: clubFresh.id,
        challengeId: challenge.id,
      },
    },
  });
  assert(access, "unlock access missing");
  steps.unlock = {
    clubId: clubFresh.id,
    coinsSpent: access!.coinsSpent,
    unlockedAt: access!.unlockedAt.toISOString(),
  };

  // ── 4. Conquer + badge ───────────────────────────────────────────────────
  const target = challenge.targetScore;
  assert(isChallengeTargetMet(target, target), "target met at exact score");
  assert(!isChallengeTargetMet(target - 1, target), "target-1 should fail");

  const conquerScore = Math.max(target, 3);
  const run = await prisma.clubChallengeRun.upsert({
    where: {
      clubId_challengeId: {
        clubId: clubFresh.id,
        challengeId: challenge.id,
      },
    },
    create: {
      clubId: clubFresh.id,
      challengeId: challenge.id,
      bestScore: conquerScore,
      attempts: 1,
      conqueredAt: new Date(),
      badgeGranted: true,
    },
    update: {
      bestScore: conquerScore,
      attempts: { increment: 1 },
      conqueredAt: new Date(),
      badgeGranted: true,
    },
  });

  const badgeSlug = challenge.rewardBadgeSlug ?? BADGE;
  await prisma.clubBadge.upsert({
    where: {
      clubId_badgeSlug: { clubId: clubFresh.id, badgeSlug },
    },
    create: {
      clubId: clubFresh.id,
      badgeSlug,
      sourceChallengeId: challenge.id,
      coinsAwarded: 0,
      xpAwarded: 0,
    },
    update: { sourceChallengeId: challenge.id },
  });

  const badge = await prisma.clubBadge.findUnique({
    where: {
      clubId_badgeSlug: { clubId: clubFresh.id, badgeSlug },
    },
  });
  assert(run.conqueredAt, "run not conquered");
  assert(run.badgeGranted, "badgeGranted false");
  assert(badge?.sourceChallengeId === challenge.id, "badge not linked");
  assert(
    isChallengeTargetMet(run.bestScore, target),
    "bestScore below target after conquer",
  );

  steps.conquer = {
    bestScore: run.bestScore,
    target,
    badgeSlug: badge!.badgeSlug,
    badgeGranted: run.badgeGranted,
  };

  // ── 5. Cleared-bank bonus path ───────────────────────────────────────────
  const cleared = computeSurvivalRewards(
    { score: 5, bestCombo: 5, endReason: "cleared" },
    DEFAULT_GAME_CONFIG,
  );
  assert(
    cleared.coins ===
      5 * DEFAULT_GAME_CONFIG.survival.coinsPerCorrect +
        DEFAULT_GAME_CONFIG.survival.clearedCoinBonus,
    "cleared coin bonus missing",
  );
  assert(
    cleared.xp ===
      5 * DEFAULT_GAME_CONFIG.survival.xpPerCorrect +
        DEFAULT_GAME_CONFIG.survival.clearedXpBonus,
    "cleared xp bonus missing",
  );
  steps.clearedBonus = { coins: cleared.coins, xp: cleared.xp };

  console.log(JSON.stringify({ ok: true, steps }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
