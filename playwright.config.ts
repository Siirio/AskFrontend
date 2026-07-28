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
    // The customer flow is mobile-first (platform-ui-design §7) — proven, not
    // asserted: every spec also runs in a phone viewport with touch enabled.
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: [
    // The search slice's Catalog Page calls `POST /api/v1/search` SERVER-SIDE
    // (D7) — a request `page.route` cannot intercept, since that only sees
    // requests the BROWSER makes. This tiny stand-in backend is the one thing
    // e2e/search.spec.ts needs that no earlier slice did (see its header
    // comment and e2e/mock-backend.mjs).
    {
      command: "node e2e/mock-backend.mjs",
      url: "http://localhost:4100/healthz",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: "next build && next start",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      env: { NEXT_PUBLIC_API_BASE_URL: "http://localhost:4100" },
    },
  ],
});
