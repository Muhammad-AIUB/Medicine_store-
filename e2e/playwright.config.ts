import { defineConfig } from "@playwright/test";

/**
 * E2E prerequisites: PostgreSQL running (npm run db:up), migrated and seeded.
 * The three app servers are started automatically below.
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  fullyParallel: false, // tests share one database — run serially
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "npm run start:dev -w server",
      cwd: "..",
      url: "http://localhost:3001/config",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run dev -w client",
      cwd: "..",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run dev -w admin",
      cwd: "..",
      url: "http://localhost:3002/login",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
