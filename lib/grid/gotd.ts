/**
 * Game of the Day rotator (ADR 002): one daily type per Tehran day.
 * Even day-of-month → Grid; odd → Mystery.
 */
export function gameOfTheDayKind(
  dateKey: string,
): "mystery" | "grid" {
  const day = Number(dateKey.slice(-2));
  if (!Number.isFinite(day)) return "mystery";
  return day % 2 === 0 ? "grid" : "mystery";
}
