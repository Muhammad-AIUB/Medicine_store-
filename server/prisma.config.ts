import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node prisma/seed.ts",
  },
  datasource: {
    // Migrate/CLI connection; the runtime client uses the PrismaPg adapter
    // constructed in PrismaService (Prisma 7 driver-adapter setup).
    // DIRECT_DATABASE_URL exists for hosts like Neon whose pooled endpoint
    // (PgBouncer) can't run migrations; falls back to DATABASE_URL.
    url:
      process.env.DIRECT_DATABASE_URL ??
      process.env.DATABASE_URL ??
      "postgresql://medistore:medistore_dev@localhost:5432/medistore",
  },
});
