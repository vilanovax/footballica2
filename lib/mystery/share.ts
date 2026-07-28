import type { AttributeVerdict, CompareVerdict, MysteryGuessRecord } from "./types";

function attrEmoji(v: AttributeVerdict): string {
  if (v === "correct") return "🟩";
  if (v === "close") return "🟨";
  return "🟥";
}

function cmpEmoji(v: CompareVerdict): string {
  if (v === "correct") return "🟩";
  if (v === "higher") return "🔼";
  return "🔽";
}

/**
 * Shareable grid — one line per guess:
 * nationality · position · league · club · age · shirt
 */
export function buildMysteryShareCode(guesses: MysteryGuessRecord[]): string {
  return guesses
    .map(
      (g) =>
        `${attrEmoji(g.nationality)}${attrEmoji(g.position)}${attrEmoji(g.league)}${attrEmoji(g.club)}${cmpEmoji(g.age)}${cmpEmoji(g.shirtNumber)}`,
    )
    .join("\n");
}
