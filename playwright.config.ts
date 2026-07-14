import { defineConfig, devices } from "@playwright/test";

/**
 * E2E harness (roadmap Phase 0a): drives the PRODUCTION build —
 * `next build && next start` — never the dev server, so what passes here is
 * what ships. Tests live in e2e/ at the package root, outside src/ (§2).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "next build && next start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
