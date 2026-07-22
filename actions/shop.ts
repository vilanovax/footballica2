"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { toClubSnapshot } from "@/lib/dev/dummyClub";
import { requireUserClub } from "@/lib/player/current";
import {
  UPGRADES,
  getUpgradeCost,
  type ClubSnapshot,
  type UpgradeKey,
} from "@/lib/club/upgrades";
import { getGameConfig } from "@/lib/game/gameConfig";
import type { GameConfig } from "@/lib/game/economy";
import { computeStaminaRegen } from "@/lib/club/stamina";
import {
  COIN_PACKS,
  isCoinPackTier,
  type CoinPackTier,
} from "@/lib/game/coinPacks";
import {
  assertStaminaRefillCooldown,
  clearStaminaRefillCooldown,
  countRecentCoinPacks,
  MAX_COIN_PACKS_PER_DAY,
} from "@/lib/economy/rateLimit";

/** Machine-readable failure codes so the client can localize the toast. */
export type ShopErrorCode =
  | "insufficient"
  | "maxed"
  | "already_full"
  | "rate_limited"
  | "unknown"
  | "generic";

export type ShopResult =
  | { ok: true; club: ClubSnapshot }
  | { ok: false; code: ShopErrorCode };

/** Purchasable booster types → the Club field + GameConfig cost key. */
const BOOSTER_ITEMS = {
  FIFTY_FIFTY: {
    field: "boosterFiftyFifty",
    costKey: "boosterFiftyFifty",
  },
  FREEZE_TIMER: {
    field: "boosterFreezeTimer",
    costKey: "boosterFreezeTimer",
  },
} as const satisfies Record<
  string,
  { field: keyof Prisma.ClubUpdateInput; costKey: keyof GameConfig["costs"] }
>;

export type BoosterShopType = keyof typeof BOOSTER_ITEMS;

/** Thrown for user-facing validation failures (aborts the transaction). */
class ShopError extends Error {
  constructor(public code: ShopErrorCode) {
    super(code);
  }
}

/**
 * Secure club upgrade purchase. The client sends ONLY the upgrade key — never a
 * cost. The server reads the authoritative level + balance, recomputes the cost
 * from shared rules, verifies affordability, then deducts + increments atomically.
 */
export async function buyUpgrade(key: UpgradeKey): Promise<ShopResult> {
  const def = UPGRADES[key];
  if (!def) return { ok: false, code: "unknown" };

  try {
    const snapshot = await prisma.$transaction(async (tx) => {
      const pair = await requireUserClub(tx);
      if (!pair) throw new ShopError("generic");
      const { club } = pair;

      const currentLevel = club[def.field];
      const cost = getUpgradeCost(key, currentLevel);

      if (cost === null) throw new ShopError("maxed");
      if (club.coins < cost) throw new ShopError("insufficient");

      const data: Prisma.ClubUpdateInput = {
        coins: { decrement: cost },
        [def.field]: { increment: 1 },
      };

      // Training Ground expands stamina capacity (and tops it up as a bonus).
      if (key === "TRAINING_GROUND") {
        data.maxStamina = { increment: 1 };
        data.stamina = { increment: 1 };
      }

      // FTUE: buying the guided first upgrade completes the tutorial (1 → 2).
      if (club.tutorialStep === 1) data.tutorialStep = 2;

      const updated = await tx.club.update({ where: { id: club.id }, data });
      return toClubSnapshot(updated);
    });

    revalidatePath("/shop");
    revalidatePath("/club");
    return { ok: true, club: snapshot };
  } catch (err) {
    if (err instanceof ShopError) return { ok: false, code: err.code };
    console.error("buyUpgrade failed", err);
    return { ok: false, code: "generic" };
  }
}

/**
 * Secure consumable booster purchase. Cost is read from the (Live-Ops) GameConfig
 * on the server; the client never dictates price. Deducts coins + increments the
 * matching inventory field atomically.
 */
export async function buyBooster(type: BoosterShopType): Promise<ShopResult> {
  const def = BOOSTER_ITEMS[type];
  if (!def) return { ok: false, code: "unknown" };

  const config = await getGameConfig();
  const cost = config.costs[def.costKey];

  try {
    const snapshot = await prisma.$transaction(async (tx) => {
      const pair = await requireUserClub(tx);
      if (!pair) throw new ShopError("generic");
      const { club } = pair;

      if (club.coins < cost) throw new ShopError("insufficient");

      const updated = await tx.club.update({
        where: { id: club.id },
        data: {
          coins: { decrement: cost },
          [def.field]: { increment: 1 },
        },
      });
      return toClubSnapshot(updated);
    });

    revalidatePath("/shop");
    revalidatePath("/club");
    return { ok: true, club: snapshot };
  } catch (err) {
    if (err instanceof ShopError) return { ok: false, code: err.code };
    console.error("buyBooster failed", err);
    return { ok: false, code: "generic" };
  }
}

/**
 * Soft-currency stamina top-up. Not written to PurchaseLog (IAP ledger only).
 * Session club only — never accepts clubId from the client.
 */
export async function buyStaminaRefill(): Promise<ShopResult> {
  const config = await getGameConfig();
  const cost = config.costs.staminaRefill;
  let cooldownClubId: string | null = null;

  try {
    const snapshot = await prisma.$transaction(async (tx) => {
      const pair = await requireUserClub(tx);
      if (!pair) throw new ShopError("generic");
      const { club } = pair;

      if (!assertStaminaRefillCooldown(club.id)) {
        throw new ShopError("rate_limited");
      }
      cooldownClubId = club.id;

      const now = new Date();
      const regen = computeStaminaRegen(club, now);
      if (regen.stamina >= club.maxStamina) {
        throw new ShopError("already_full");
      }
      if (club.coins < cost) throw new ShopError("insufficient");

      const updated = await tx.club.update({
        where: { id: club.id },
        data: {
          coins: { decrement: cost },
          stamina: club.maxStamina,
          lastStaminaUpdate: now,
        },
      });
      return toClubSnapshot(updated);
    });

    revalidatePath("/shop");
    revalidatePath("/club");
    revalidatePath("/play");
    return { ok: true, club: snapshot };
  } catch (err) {
    if (cooldownClubId) clearStaminaRefillCooldown(cooldownClubId);
    if (err instanceof ShopError) return { ok: false, code: err.code };
    console.error("buyStaminaRefill failed", err);
    return { ok: false, code: "generic" };
  }
}

/**
 * Mock IAP coin pack. Catalog is server-only; client sends `packTier` only.
 * Writes an immutable PurchaseLog row (SUCCESS) then credits coins.
 */
export async function purchaseCoinPack(
  packTier: string,
): Promise<ShopResult> {
  if (!isCoinPackTier(packTier)) return { ok: false, code: "unknown" };
  const pack = COIN_PACKS[packTier as CoinPackTier];

  try {
    const snapshot = await prisma.$transaction(async (tx) => {
      const pair = await requireUserClub(tx);
      if (!pair) throw new ShopError("generic");
      const { club } = pair;

      const recent = await countRecentCoinPacks(club.id, tx);
      if (recent >= MAX_COIN_PACKS_PER_DAY) {
        throw new ShopError("rate_limited");
      }

      await tx.purchaseLog.create({
        data: {
          clubId: club.id,
          packTier: pack.tier,
          price: pack.price,
          currency: pack.currency,
          coinsGranted: pack.coinsGranted,
          status: "SUCCESS",
        },
      });

      const updated = await tx.club.update({
        where: { id: club.id },
        data: { coins: { increment: pack.coinsGranted } },
      });
      return toClubSnapshot(updated);
    });

    revalidatePath("/shop");
    revalidatePath("/club");
    return { ok: true, club: snapshot };
  } catch (err) {
    if (err instanceof ShopError) return { ok: false, code: err.code };
    console.error("purchaseCoinPack failed", err);
    return { ok: false, code: "generic" };
  }
}
