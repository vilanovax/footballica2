/**
 * Seed iconic players with pastClubs + trophies for Grid intersection testing.
 *
 * Run: npm run seed:grid-players
 */
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { upsertGridSeedPlayers } from "../lib/grid/seedGridPlayers";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await upsertGridSeedPlayers(prisma);
  console.log(
    `[seed:grid-players] upserted ${result.upserted}: ${result.slugs.join(", ")}`,
  );
}

main()
  .catch((err) => {
    console.error("[seed:grid-players] failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
