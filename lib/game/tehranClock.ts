/**
 * Client-safe Tehran calendar helpers (Asia/Tehran).
 * Keep free of server-only so MissionDrawer countdown can import it.
 */

const TEHRAN = "Asia/Tehran";

const dayParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TEHRAN,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const hourParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: TEHRAN,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Milliseconds until next Tehran midnight. */
export function msUntilTehranMidnight(now: Date = new Date()): number {
  const hms = hourParts.formatToParts(now);
  const hour = Number(hms.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(hms.find((p) => p.type === "minute")?.value ?? 0);
  const second = Number(hms.find((p) => p.type === "second")?.value ?? 0);
  const elapsedMs = ((hour * 60 + minute) * 60 + second) * 1000;
  const dayMs = 86_400_000;
  return Math.max(0, dayMs - elapsedMs);
}

/** `HH:MM:SS` (or `HH:MM` when > 1h) countdown string in locale digits later. */
export function formatCountdownHms(ms: number): { h: number; m: number; s: number } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { h, m, s };
}

export function tehranDayKeyClient(date: Date = new Date()): string {
  return dayParts.format(date);
}
