/**
 * Write stylized SVG placeholders into public/players/{slug}.svg
 * for Mystery + Grid seed catalogs.
 *
 * Run: npm run seed:player-photos
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildPlayerPhotoSvg,
  listPlayerPhotoMetas,
} from "../lib/players/photoArt";

async function main() {
  const dir = path.join(process.cwd(), "public", "players");
  await mkdir(dir, { recursive: true });

  const metas = listPlayerPhotoMetas();
  for (const meta of metas) {
    const file = path.join(dir, `${meta.slug}.svg`);
    await writeFile(file, buildPlayerPhotoSvg(meta), "utf8");
  }

  console.log(
    `[seed:player-photos] wrote ${metas.length} SVGs → public/players/`,
  );
  console.log(metas.map((m) => m.slug).join(", "));
}

main().catch((err) => {
  console.error("[seed:player-photos] failed", err);
  process.exit(1);
});
