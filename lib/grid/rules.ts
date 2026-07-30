import type { GridAxis, GridAxisRule, GridRuleKind } from "./types";

export type GridPlayerAttrs = {
  league: string;
  position: string;
  nationalityCode: string;
  /** Current club (also counted as career). */
  club: string;
  /** Career clubs (names). Current club is matched separately too. */
  pastClubs: string[];
  trophies: string[];
};

/** Normalize tag for case-insensitive club/trophy compare. */
export function normTag(value: string): string {
  return value.trim().toLowerCase();
}

/** Coerce Json / unknown into a clean string tag list. */
export function asGridTagList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const tag = item.trim();
    if (!tag) continue;
    const key = normTag(tag);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

/** Map a DB / seed player row into matchable attrs. */
export function toGridPlayerAttrs(row: {
  league: string;
  position: string;
  nationalityCode: string;
  club: string;
  pastClubs?: unknown;
  trophies?: unknown;
}): GridPlayerAttrs {
  return {
    league: row.league,
    position: row.position,
    nationalityCode: row.nationalityCode,
    club: row.club,
    pastClubs: asGridTagList(row.pastClubs),
    trophies: asGridTagList(row.trophies),
  };
}

/** All career club labels (current + past), de-duped. */
export function careerClubs(player: GridPlayerAttrs): string[] {
  return asGridTagList([player.club, ...player.pastClubs]);
}

function hasCareerClub(player: GridPlayerAttrs, club: string): boolean {
  const target = normTag(club);
  if (!target) return false;
  return careerClubs(player).some((c) => normTag(c) === target);
}

function hasTrophy(player: GridPlayerAttrs, trophy: string): boolean {
  const target = normTag(trophy);
  if (!target) return false;
  return player.trophies.some((t) => normTag(t) === target);
}

export function playerMatchesRule(
  player: GridPlayerAttrs,
  rule: GridAxisRule,
): boolean {
  switch (rule.kind) {
    case "league":
      return normTag(player.league) === normTag(rule.value);
    case "position":
      return player.position === rule.value;
    case "nationalityCode":
      return (
        player.nationalityCode.toUpperCase() === rule.value.trim().toUpperCase()
      );
    case "club":
      // Immortal-style: current OR pastClubs
      return hasCareerClub(player, rule.value);
    case "trophy":
      return hasTrophy(player, rule.value);
    default:
      return false;
  }
}

export function playerMatchesCell(
  player: GridPlayerAttrs,
  row: GridAxis,
  col: GridAxis,
): boolean {
  return (
    playerMatchesRule(player, row.rule) && playerMatchesRule(player, col.rule)
  );
}

const POSITION_LABEL: Record<string, { labelEn: string; labelFa: string }> = {
  GK: { labelEn: "Goalkeeper", labelFa: "دروازه‌بان" },
  DEF: { labelEn: "Defender", labelFa: "مدافع" },
  MID: { labelEn: "Midfielder", labelFa: "هافبک" },
  FWD: { labelEn: "Forward", labelFa: "مهاجم" },
};

export function axisLabel(
  kind: GridRuleKind,
  value: string,
): { labelEn: string; labelFa: string } {
  if (kind === "position") {
    return POSITION_LABEL[value] ?? { labelEn: value, labelFa: value };
  }
  return { labelEn: value, labelFa: value };
}

export function makeAxis(
  id: string,
  kind: GridRuleKind,
  value: string,
  labels?: { labelEn: string; labelFa: string },
): GridAxis {
  const lab = labels ?? axisLabel(kind, value);
  return {
    id,
    labelEn: lab.labelEn,
    labelFa: lab.labelFa,
    rule: { kind, value },
  };
}
