import { getRequestConfig } from "next-intl/server";

import { defaultLocale } from "./locales";

/**
 * next-intl server config — the ONE i18n mechanism (§7, D2).
 *
 * Locale selection UI arrives with the profile settings screen
 * (PRODUCT_VISION UF 2.3, roadmap Phase 1); until a real selector exists,
 * every request renders the default locale. Deliberately NOT reading a cookie
 * here: request-time cookie access would force dynamic rendering and break
 * the static, SEO-first marketing landing (D6).
 */
export default getRequestConfig(async () => {
  const locale = defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
