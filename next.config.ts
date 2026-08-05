import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Lint is an explicit, mandatory stage of the build pipeline — `npm run
// build` chains eslint src → the lint-fixtures proof → next build. (Next 16
// no longer runs ESLint itself.)
const nextConfig: NextConfig = {
  // react-leaflet's `MapContainer` (business-cabinet's BranchMapCanvas) does
  // not tolerate Strict Mode's dev-only double-mount: the second mount finds
  // Leaflet's `_leaflet_id` still on the DOM node from the first and throws
  // "Map container is being reused by another instance", which Next then
  // recovers from with a FULL PAGE RELOAD — silently wiping all in-memory
  // React state on every reopen of the branch map modal (2026-08-05, traced
  // after repeated "data clears on close" reports that survived several
  // rounds of fixing the modal's own state logic, which turned out to be
  // correct all along). Strict Mode never runs in production regardless, so
  // this has no production effect — it only stops a dev-only crash loop.
  reactStrictMode: false,
  // Pin the workspace root: a stray lockfile in the user profile otherwise
  // makes Next infer the wrong root for turbopack and file tracing.
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  // Business-uploaded images (brand logos, branch photos) come from hosts the
  // backend does not enumerate — a business picks its own storage. The §7
  // single-implementation rule ("next/image for every raster image, raw <img>
  // banned") still applies to them, so the remote pattern is a wildcard
  // rather than an exemption: every raster image goes through next/image,
  // this just widens which hosts it's allowed to optimize.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

// The ONE i18n mechanism (§7, D2): next-intl, request config in shared/i18n.
const withNextIntl = createNextIntlPlugin("./src/shared/i18n/request.ts");

export default withNextIntl(nextConfig);
