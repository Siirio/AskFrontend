import type { FullConfig } from "@playwright/test";

/**
 * Fails the run when the harness is pointed at a DEV server (AUDIT_2 N10).
 *
 * `playwright.config.ts` promises this suite "drives the PRODUCTION build —
 * `next build && next start` — never the dev server, so what passes here is
 * what ships". Both `webServer` entries then set
 * `reuseExistingServer: !process.env.CI`, so locally Playwright reuses whatever
 * already owns the port instead of building. If that is `npm run dev`, the whole
 * suite silently grades the dev server: different prerendering, different
 * metadata generation, no minification, an error overlay. It still reports
 * green, which is the worst possible outcome — CI never sees it, because CI sets
 * `reuseExistingServer: false`.
 *
 * A dev server is identified by markup only it emits: Next.js serves a
 * `next-devtools` chunk and long unminified `node_modules_next_dist_compiled_*`
 * chunk names in development, and neither survives a production build.
 *
 * This stops the run rather than warning. A warning in a passing suite is read
 * as noise; the point of the guard is that "green" keeps meaning something.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (!baseURL) return;

  let html: string;
  try {
    const response = await fetch(new URL("/app/auth/login", baseURL));
    html = await response.text();
  } catch {
    // Unreachable here is not this guard's business — Playwright's own
    // webServer wait reports a down server far more clearly than we can.
    return;
  }

  const devMarkers = ["next-devtools", "node_modules_next_dist_compiled"];
  const found = devMarkers.filter((marker) => html.includes(marker));
  if (found.length === 0) return;

  throw new Error(
    [
      `e2e is pointed at a DEV server (${baseURL}) — refusing to run.`,
      `Dev-only markup found: ${found.join(", ")}.`,
      "",
      "This suite must drive the production build, or a green result proves",
      "nothing about what ships (AUDIT_2 N10).",
      "",
      "Fix: stop the dev server on that port and re-run, so Playwright's",
      "webServer builds and starts its own. Note `next build` also cannot run",
      "while a dev server holds the same .next directory.",
    ].join("\n"),
  );
}
