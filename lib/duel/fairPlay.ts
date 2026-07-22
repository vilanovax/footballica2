import "server-only";

/** Keys that must never appear on a Draft Duel submit payload. */
const DUEL_FORBIDDEN_KEYS = new Set([
  "booster",
  "boosters",
  "helper",
  "helpers",
  "usedHelp",
  "hint",
  "extraTime",
  "fifty",
  "fiftyFifty",
  "boosterFiftyFifty",
  "freeze",
  "freezeTimer",
  "boosterFreezeTimer",
]);

/**
 * Belt-and-suspenders: reject modified clients that smuggle solo-mode helpers
 * into Draft Duel answer payloads.
 */
export function assertNoDuelBoosters(payload: unknown): void {
  visit(payload, 0);
}

function visit(value: unknown, depth: number): void {
  if (value == null || depth > 6) return;
  if (Array.isArray(value)) {
    for (const item of value) visit(item, depth + 1);
    return;
  }
  if (typeof value !== "object") return;

  for (const [key, child] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (DUEL_FORBIDDEN_KEYS.has(key)) {
      throw new Error("Boosters are not allowed in Duel mode");
    }
    visit(child, depth + 1);
  }
}
