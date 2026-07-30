/**
 * One-shot Live-Ops content bootstrap (CLI-safe — no server-only imports):
 * 1) Bootstrap FootballPlayer catalog (skipDuplicates)
 * 2) Upsert Grid Immortal pack (pastClubs / trophies)
 * 3) Write stylized /players/{slug}.svg portraits
 * 4) Ensure Mystery + Grid week via cron HTTP (if server + CRON_SECRET)
 *
 * Run: npm run seed:liveops-content
 * Admin alternative for step 4: Mystery Day / Grid Day → “Fill 7-day gaps”
 */

import { config } from "dotenv";
config({ path: ".env" });

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { upsertGridSeedPlayers } from "../lib/grid/seedGridPlayers";
import { SEED_FOOTBALL_PLAYERS } from "../lib/mystery/seedCatalog";
import {
  buildPlayerPhotoSvg,
  listPlayerPhotoMetas,
} from "../lib/players/photoArt";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const pool = new pg.Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const catalog = await prisma.footballPlayer.createMany({
      data: SEED_FOOTBALL_PLAYERS.map((p) => ({
        slug: p.id,
        nameEn: p.nameEn,
        nameFa: p.nameFa,
        nationality: p.nationality,
        nationalityCode: p.nationalityCode,
        position: p.position,
        league: p.league,
        club: p.club,
        age: p.age,
        shirtNumber: p.shirtNumber,
        isActive: true,
      })),
      skipDuplicates: true,
    });
    console.log(`[liveops] catalog insert skippedDuplicates · new=${catalog.count}`);

    const grid = await upsertGridSeedPlayers(prisma);
    console.log(
      `[liveops] grid pack upserted ${grid.upserted}: ${grid.slugs.join(", ")}`,
    );

    const dir = path.join(process.cwd(), "public", "players");
    await mkdir(dir, { recursive: true });
    const metas = listPlayerPhotoMetas();
    for (const meta of metas) {
      await writeFile(
        path.join(dir, `${meta.slug}.svg`),
        buildPlayerPhotoSvg(meta),
        "utf8",
      );
    }
    console.log(`[liveops] player photos: ${metas.length} SVGs → public/players/`);

    const secret = process.env.CRON_SECRET?.trim();
    const base =
      process.env.LIVEOPS_BASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      "http://localhost:3000";

    if (!secret) {
      console.log(
        "[liveops] CRON_SECRET missing — skip schedule HTTP. Use Admin → Fill 7-day gaps.",
      );
    } else {
      for (const pathName of ["/api/cron/mystery", "/api/cron/grid"] as const) {
        const res = await fetch(`${base}${pathName}`, {
          headers: { Authorization: `Bearer ${secret}` },
        });
        const body = await res.text();
        console.log(
          `[liveops] ${pathName} → ${res.status} ${body.slice(0, 200)}`,
        );
      }
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[seed:liveops-content] failed", err);
  process.exit(1);
});
