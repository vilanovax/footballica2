import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma v7 central config. The datasource URL moved here out of schema.prisma.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // v7 no longer auto-seeds after migrate; run `prisma db seed` explicitly.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
