import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  eslint: {
    // Lint is a mandatory, explicit stage of the build pipeline:
    // `npm run build` = eslint src → lint-fixtures proof → next build.
    // Next's implicit lint pass would only duplicate that stage.
    ignoreDuringBuilds: true,
  },
};

// The ONE i18n mechanism (§7, D2): next-intl, request config in shared/i18n.
const withNextIntl = createNextIntlPlugin("./src/shared/i18n/request.ts");

export default withNextIntl(nextConfig);
