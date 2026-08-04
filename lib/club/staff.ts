// Pure Club Staff catalog + hire math (ADR 004 Phase B).
// Catalog lives in GameConfig.businessEconomy.staff.templates (admin-editable).

import type { GameConfig, StaffTemplateConfig } from "@/lib/game/economy";
import { DEFAULT_GAME_CONFIG } from "@/lib/game/economy";
import type { BusinessFacilityKey } from "@/lib/club/businessEconomy";
import type { AvatarKey } from "@/lib/onboarding/avatars";
import { getAvatar } from "@/lib/onboarding/avatars";

export type StaffRole = "MANAGER" | "TREASURER";

export type StaffTemplate = StaffTemplateConfig;

export type StaffMemberView = {
  id: string;
  templateKey: string;
  nameEn: string;
  nameFa: string;
  role: StaffRole;
  rateBonusPercent: number;
  avatarKey: string;
  avatarImage: string;
  avatarEmoji: string;
  assignedFacilityKey: BusinessFacilityKey | null;
};

export type StaffOfferView = {
  templateKey: string;
  nameEn: string;
  nameFa: string;
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
  /** Cheapest visible offer cost, or null if none. */
  nextHireCost: number | null;
  canHire: boolean;
  hasTreasurer: boolean;
  /** Admin catalog keys in display order — hired stay in place in the UI list. */
  catalogKeys: string[];
  members: StaffMemberView[];
  offers: StaffOfferView[];
};

export function listStaffTemplates(
  config: GameConfig = DEFAULT_GAME_CONFIG,
): StaffTemplate[] {
  return config.businessEconomy.staff.templates;
}

export function getStaffTemplate(
  key: string,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): StaffTemplate | undefined {
  return listStaffTemplates(config).find((t) => t.key === key);
}

export function staffRateMultiplier(rateBonusPercent: number): number {
  return 1 + Math.max(0, rateBonusPercent) / 100;
}

/** Effective hire cost for a template after roster-size growth. */
export function hireCostForTemplate(
  template: StaffTemplate,
  hiredCount: number,
  config: GameConfig = DEFAULT_GAME_CONFIG,
): number {
  const growth = config.businessEconomy.staff.hireCostGrowth;
  return Math.max(
    1,
    Math.round(
      template.hireCost * Math.pow(growth, Math.max(0, hiredCount)),
    ),
  );
}

/**
 * Hire offers in admin catalog order (not shuffled).
 * Excludes already-hired templates; capped by offerCount.
 */
export function buildStaffOffers(input: {
  hiredTemplateKeys: string[];
  hiredCount: number;
  clubFunds: number;
  config?: GameConfig;
}): StaffOfferView[] {
  const config = input.config ?? DEFAULT_GAME_CONFIG;
  const staffCfg = config.businessEconomy.staff;
  if (!staffCfg.enabled) return [];

  const hired = new Set(input.hiredTemplateKeys);
  const pool = listStaffTemplates(config).filter((t) => !hired.has(t.key));
  if (pool.length === 0) return [];

  const count = Math.min(staffCfg.offerCount, pool.length);
  return pool.slice(0, count).map((t) => {
    const av = getAvatar(t.avatarKey as AvatarKey);
    const cost = hireCostForTemplate(t, input.hiredCount, config);
    return {
      templateKey: t.key,
      nameEn: t.nameEn,
      nameFa: t.nameFa,
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

export function toStaffMemberView(
  row: {
    id: string;
    templateKey: string;
    avatarKey: string;
    role: StaffRole;
    rateBonusPercent: number;
    assignedFacilityKey: BusinessFacilityKey | null;
  },
  config: GameConfig = DEFAULT_GAME_CONFIG,
): StaffMemberView {
  const tmpl = getStaffTemplate(row.templateKey, config);
  const av = getAvatar(
    (row.avatarKey as AvatarKey) ||
      (tmpl?.avatarKey as AvatarKey) ||
      "TACTICAL_COACH",
  );
  return {
    id: row.id,
    templateKey: row.templateKey,
    nameEn: tmpl?.nameEn ?? row.templateKey,
    nameFa: tmpl?.nameFa ?? row.templateKey,
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
  const offers =
    atCap || !s.enabled
      ? []
      : buildStaffOffers({
          hiredTemplateKeys: input.members.map((m) => m.templateKey),
          hiredCount,
          clubFunds: input.clubFunds,
          config,
        });
  const affordable = offers.filter((o) => o.canAfford);
  const nextHireCost =
    offers.length === 0
      ? null
      : Math.min(...offers.map((o) => o.cost));

  return {
    enabled: s.enabled,
    maxHired: s.maxHired,
    hiredCount,
    nextHireCost: atCap || !s.enabled ? null : nextHireCost,
    canHire: affordable.length > 0,
    hasTreasurer: input.members.some((m) => m.role === "TREASURER"),
    catalogKeys: listStaffTemplates(config).map((t) => t.key),
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

export function staffDisplayName(
  member: { nameEn: string; nameFa: string },
  locale: "en" | "fa",
): string {
  return locale === "fa" ? member.nameFa : member.nameEn;
}
