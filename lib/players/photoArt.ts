/**
 * Stylized jersey-disc SVG generators for Live-Ops photo pack (CLI / seed only).
 * Not a likeness — initials + shirt number + position color.
 */

import { GRID_SEED_PLAYERS } from "@/lib/grid/seedGridPlayers";
import { SEED_FOOTBALL_PLAYERS } from "@/lib/mystery/seedCatalog";
import { PLAYER_PHOTO_SLUGS } from "@/lib/players/photos";

const POS_COLORS: Record<string, { bg: string; fg: string; ring: string }> = {
  GK: { bg: "#b45309", fg: "#fff7ed", ring: "#fbbf24" },
  DEF: { bg: "#0369a1", fg: "#e0f2fe", ring: "#38bdf8" },
  MID: { bg: "#6d28d9", fg: "#f5f3ff", ring: "#a78bfa" },
  FWD: { bg: "#be123c", fg: "#fff1f2", ring: "#fb7185" },
};

export type PlayerPhotoMeta = {
  slug: string;
  nameEn: string;
  position: string;
  shirtNumber: number;
};

/** Union of Mystery bootstrap + Grid Immortal pack (allowlisted slugs only). */
export function listPlayerPhotoMetas(): PlayerPhotoMeta[] {
  const allow = new Set<string>(PLAYER_PHOTO_SLUGS);
  const bySlug = new Map<string, PlayerPhotoMeta>();

  for (const p of SEED_FOOTBALL_PLAYERS) {
    if (!allow.has(p.id)) continue;
    bySlug.set(p.id, {
      slug: p.id,
      nameEn: p.nameEn,
      position: p.position,
      shirtNumber: p.shirtNumber,
    });
  }
  for (const p of GRID_SEED_PLAYERS) {
    if (!allow.has(p.slug)) continue;
    bySlug.set(p.slug, {
      slug: p.slug,
      nameEn: p.nameEn,
      position: p.position,
      shirtNumber: p.shirtNumber,
    });
  }

  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

export function buildPlayerPhotoSvg(meta: PlayerPhotoMeta): string {
  const tone = POS_COLORS[meta.position] ?? POS_COLORS.MID!;
  const initials = meta.nameEn
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const num = String(meta.shirtNumber);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="${escapeXml(meta.nameEn)}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${tone.bg}"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <circle cx="64" cy="64" r="62" fill="url(#g)" stroke="${tone.ring}" stroke-width="4"/>
  <text x="64" y="58" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="34" font-weight="800" fill="${tone.fg}">${escapeXml(initials)}</text>
  <text x="64" y="92" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="18" font-weight="700" fill="${tone.ring}">#${escapeXml(num)}</text>
</svg>
`;
}

function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
