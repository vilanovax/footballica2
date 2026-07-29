import type { GridAxis, GridAxisRule, GridRuleKind } from "./types";

export type GridPlayerAttrs = {
  league: string;
  position: string;
  nationalityCode: string;
  club: string;
};

export function playerMatchesRule(
  player: GridPlayerAttrs,
  rule: GridAxisRule,
): boolean {
  switch (rule.kind) {
    case "league":
      return player.league === rule.value;
    case "position":
      return player.position === rule.value;
    case "nationalityCode":
      return player.nationalityCode === rule.value;
    case "club":
      return player.club === rule.value;
    default:
      return false;
  }
}

export function playerMatchesCell(
  player: GridPlayerAttrs,
  row: GridAxis,
  col: GridAxis,
): boolean {
  return playerMatchesRule(player, row.rule) && playerMatchesRule(player, col.rule);
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
