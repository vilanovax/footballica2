/**
 * Clean club labels for league UI.
 * Dev seed used to append ` ${Date.now()}-${i}` — strip that for display.
 */
export function displayClubName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "—";
  const cleaned = trimmed.replace(/\s+\d{10,}(-\d+)?$/u, "").trim();
  return cleaned.length > 0 ? cleaned : trimmed;
}

/** Short label for tight podium slots. */
export function shortClubName(name: string, max = 14): string {
  const base = displayClubName(name);
  if (base.length <= max) return base;
  return `${base.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}
