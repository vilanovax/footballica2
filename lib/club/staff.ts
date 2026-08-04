// Pure Club Staff catalog + hire math (ADR 004 Phase B).
// Framework-free — shared by server actions and Hub preview.

import type { GameConfig } from "@/lib/game/economy";
import { DEFAULT_GAME_CONFIG } from "@/lib/game/economy";
import type { BusinessFacilityKey } from "@/lib/club/businessEconomy";
import type { AvatarKey } from "@/lib/onboarding/avatars";
import { getAvatar } from "@/lib/onboarding/avatars";

export type StaffRole = "MANAGER" | "TREASURER";

export type StaffTemplate = {
  key: string;
  role: StaffRole;
  /** Percent points, e.g. 12 → +12% rate on assigned facility. */
  rateBonusPercent: number;
  avatarKey: AvatarKey;
  /** i18n suffix under club.staff.templates.* */
  nameKey: string;
};

/** Fixed Phase B catalog — one pool, different numbers + avatars. */
export const STAFF_TEMPLATES: readonly StaffTemplate[] = [
  {
    key: "ops_junior",
    role: "MANAGER",
    rateBonusPercent: 8,
    avatarKey: "YOUNG_DIRECTOR",
    nameKey: "opsJunior",
  },
  {
    key: "ops_mid",
    role: "MANAGER",
    rateBonusPercent: 12,
    avatarKey: "TACTICAL_COACH",
    nameKey: "opsMid",
  },
  {
    key: "ops_star",
    role: "MANAGER",
    rateBonusPercent: 18,
    avatarKey: "STAR_MANAGER",
    nameKey: "opsStar",
  },
  {
    key: "treasurer",
    role: "TREASURER",
    rateBonusPercent: 5,
    avatarKey: "OLD_GAFFER",
    nameKey: "treasurer",
  },
] as const;

export type StaffMemberView = {
  id: string;
  templateKey: string;
  nameKey: string;
  role: StaffRole;
  rateBonusPercent: number;
  avatarKey: string;
  avatarImage: string;
  avatarEmoji: string;
  assignedFacilityKey: BusinessFacilityKey | null;
};

export type StaffOfferView = {
  templateKey: string;
  nameKey: string;
  role: StaffRole;
  rateBonusPercent: number;
  avatarKey: string;
  avatarImage: string;
  avatarEmoji: string;
  cost: number;
  canAfford: boolean;
};

export type StaffSnapshot = {
  enabled: boolean;
  maxHired: number;
  hiredCount: number;
  nextHireCost: number | null;
  canHire: boolean;
  hasTreasurer: boolean;
  members: StaffMemberView[];
  offers: StaffOfferView[];
};

export function getStaffTemplate(key: string): StaffTemplate | undefined {
  return STAFF_TEMPLATES.find((t) => t.key === key);
}

export function staffRateMultiplier(rateBonusPercent: number): number {
  return 1 + Math.max(0, rateBonusPercent) / 100;
}

export function hireCostAtCount(
  hiredCount: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): number {
  const s = config.businessEconomy.staff;
  return Math.max(
    1,
    Math.round(s.hireCostBase * Math.pow(s.hireCostGrowth, Math.max(0, hiredCount))),
  );
}

/** Deterministic shuffle seed for daily offers. */
function hashSeed(parts: string[]): number {
  let h = 2166136261;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Daily hire offers — excludes templates already hired (by templateKey).
 * Seeded by club + hired count + day key so refresh is stable.
 */
export function buildStaffOffers(input: {
  clubId: string;
  hiredTemplateKeys: string[];
  hiredCount: number;
  clubFunds: number;
  dayKey: string;
  config?: GameConfig;
}): StaffOfferView[] {
  const config = input.config ?? DEFAULT_GAME_CONFIG;
  const staffCfg = config.businessEconomy.staff;
  if (!staffCfg.enabled) return [];

  const cost = hireCostAtCount(input.hiredCount, config);
  const hired = new Set(input.hiredTemplateKeys);
  const pool = STAFF_TEMPLATES.filter((t) => !hired.has(t.key));
  if (pool.length === 0) return [];

  const rng = mulberry32(
    hashSeed([input.clubId, input.dayKey, String(input.hiredCount)]),
  );
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  const count = Math.min(staffCfg.offerCount, shuffled.length);
  return shuffled.slice(0, count).map((t) => {
    const av = getAvatar(t.avatarKey);
    return {
      templateKey: t.key,
      nameKey: t.nameKey,
      role: t.role,
      rateBonusPercent: t.rateBonusPercent,
      avatarKey: t.avatarKey,
      avatarImage: av.image,
      avatarEmoji: av.emoji,
      cost,
      canAfford: input.clubFunds >= cost,
    };
  });
}

export function toStaffMemberView(row: {
  id: string;
  templateKey: string;
  avatarKey: string;
  role: StaffRole;
  rateBonusPercent: number;
  assignedFacilityKey: BusinessFacilityKey | null;
}): StaffMemberView {
  const tmpl = getStaffTemplate(row.templateKey);
  const av = getAvatar((row.avatarKey as AvatarKey) || tmpl?.avatarKey || "TACTICAL_COACH");
  return {
    id: row.id,
    templateKey: row.templateKey,
    nameKey: tmpl?.nameKey ?? "opsMid",
    role: row.role,
    rateBonusPercent: row.rateBonusPercent,
    avatarKey: row.avatarKey,
    avatarImage: av.image,
    avatarEmoji: av.emoji,
    assignedFacilityKey: row.assignedFacilityKey,
  };
}

export function buildStaffSnapshot(input: {
  clubId: string;
  clubFunds: number;
  dayKey: string;
  members: StaffMemberView[];
  config?: GameConfig;
}): StaffSnapshot {
  const config = input.config ?? DEFAULT_GAME_CONFIG;
  const s = config.businessEconomy.staff;
  const hiredCount = input.members.length;
  const atCap = hiredCount >= s.maxHired;
  const nextCost = atCap || !s.enabled ? null : hireCostAtCount(hiredCount, config);
  const offers =
    atCap || !s.enabled
      ? []
      : buildStaffOffers({
          clubId: input.clubId,
          hiredTemplateKeys: input.members.map((m) => m.templateKey),
          hiredCount,
          clubFunds: input.clubFunds,
          dayKey: input.dayKey,
          config,
        });

  return {
    enabled: s.enabled,
    maxHired: s.maxHired,
    hiredCount,
    nextHireCost: nextCost,
    canHire: Boolean(s.enabled && nextCost != null && input.clubFunds >= nextCost),
    hasTreasurer: input.members.some((m) => m.role === "TREASURER"),
    members: input.members,
    offers,
  };
}

/** Map facility key → assigned staff rate bonus percent. */
export function staffBonusByFacility(
  members: StaffMemberView[],
): Partial<Record<BusinessFacilityKey, number>> {
  const out: Partial<Record<BusinessFacilityKey, number>> = {};
  for (const m of members) {
    if (m.assignedFacilityKey) {
      out[m.assignedFacilityKey] = m.rateBonusPercent;
    }
  }
  return out;
}
