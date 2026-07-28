import type { MysteryGuessRecord } from "./types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Best-effort parse of Attempt.guesses JSON into typed rows. */
export function parseMysteryGuesses(raw: unknown): MysteryGuessRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: MysteryGuessRecord[] = [];
  for (const row of raw) {
    if (!isRecord(row)) continue;
    if (typeof row.playerId !== "string") continue;
    out.push({
      playerId: row.playerId,
      nameEn: typeof row.nameEn === "string" ? row.nameEn : row.playerId,
      nameFa: typeof row.nameFa === "string" ? row.nameFa : row.playerId,
      nationality: (row.nationality as MysteryGuessRecord["nationality"]) ?? "wrong",
      position: (row.position as MysteryGuessRecord["position"]) ?? "wrong",
      league: (row.league as MysteryGuessRecord["league"]) ?? "wrong",
      club: (row.club as MysteryGuessRecord["club"]) ?? "wrong",
      age: (row.age as MysteryGuessRecord["age"]) ?? "higher",
      shirtNumber: (row.shirtNumber as MysteryGuessRecord["shirtNumber"]) ?? "higher",
      isCorrect: Boolean(row.isCorrect),
      at: typeof row.at === "string" ? row.at : new Date(0).toISOString(),
    });
  }
  return out;
}
