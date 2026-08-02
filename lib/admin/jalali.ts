import { toGregorian, toJalaali } from "jalaali-js";

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Parse admin `YYYY-MM-DD` date key (Tehran civil day). */
export function parseDateKey(
  dateKey: string,
): { y: number; m: number; d: number } | null {
  const m = DATE_KEY_RE.exec(dateKey.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

export function formatDateKey(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Gregorian date key → Jalali parts. */
export function dateKeyToJalali(
  dateKey: string,
): { jy: number; jm: number; jd: number } | null {
  const g = parseDateKey(dateKey);
  if (!g) return null;
  return toJalaali(g.y, g.m, g.d);
}

/** Jalali parts → Gregorian date key. */
export function jalaliToDateKey(jy: number, jm: number, jd: number): string {
  const g = toGregorian(jy, jm, jd);
  return formatDateKey(g.gy, g.gm, g.gd);
}

/** Display label e.g. `۱۴۰۵/۰۵/۱۱` (Persian digits). */
export function formatJalaliLabel(dateKey: string): string {
  const j = dateKeyToJalali(dateKey);
  if (!j) return dateKey;
  const raw = `${j.jy}/${pad2(j.jm)}/${pad2(j.jd)}`;
  return raw.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

/** Compact bilingual chip: Jalali primary, Gregorian mono secondary. */
export function formatJalaliChip(dateKey: string): {
  jalali: string;
  gregorian: string;
} {
  return {
    jalali: formatJalaliLabel(dateKey),
    gregorian: dateKey,
  };
}

const DATETIME_LOCAL_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/;

/** `YYYY-MM-DDTHH:mm` (local) → parts. */
export function parseDatetimeLocal(value: string): {
  dateKey: string;
  hours: number;
  minutes: number;
} | null {
  const m = DATETIME_LOCAL_RE.exec(value.trim());
  if (!m) return null;
  return {
    dateKey: `${m[1]}-${m[2]}-${m[3]}`,
    hours: Number(m[4]),
    minutes: Number(m[5]),
  };
}

export function formatDatetimeLocal(
  dateKey: string,
  hours: number,
  minutes: number,
): string {
  return `${dateKey}T${pad2(hours)}:${pad2(minutes)}`;
}

/** ISO timestamp → browser-local `YYYY-MM-DDTHH:mm`. */
export function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatDatetimeLocal(
    formatDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate()),
    d.getHours(),
    d.getMinutes(),
  );
}

/** Browser-local `YYYY-MM-DDTHH:mm` → ISO (or null if empty/invalid). */
export function datetimeLocalToIso(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Jalali + time label for schedule chips. */
export function formatJalaliDateTimeLabel(datetimeLocal: string): string {
  const parts = parseDatetimeLocal(datetimeLocal);
  if (!parts) return datetimeLocal;
  const time = `${pad2(parts.hours)}:${pad2(parts.minutes)}`.replace(
    /\d/g,
    (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!,
  );
  return `${formatJalaliLabel(parts.dateKey)} ${time}`;
}
