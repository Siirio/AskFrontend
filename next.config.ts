import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Lint is an explicit, mandatory stage of the build pipeline — `npm run
// build` chains eslint src → the lint-fixtures proof → next build. (Next 16
// no longer runs ESLint itself.)
const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in the user profile otherwise
  // makes Next infer the wrong root for turbopack and file tracing.
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
};

// The ONE i18n mechanism (§7, D2): next-intl, request config in shared/i18n.
const withNextIntl = createNextIntlPlugin("./src/shared/i18n/request.ts");

export default withNextIntl(nextConfig);
