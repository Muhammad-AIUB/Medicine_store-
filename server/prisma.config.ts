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
    url: process.env.DATABASE_URL ?? "postgresql://medistore:medistore_dev@localhost:5432/medistore",
  },
});
