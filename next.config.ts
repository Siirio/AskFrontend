import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Lint is a mandatory, explicit stage of the build pipeline:
    // `npm run build` = eslint src → lint-fixtures proof → next build.
    // Next's implicit lint pass would only duplicate that stage.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
