import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma v7 central config. The datasource URL moved here out of schema.prisma.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
