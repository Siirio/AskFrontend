import { getRequestConfig } from "next-intl/server";

import { defaultLocale, parseLocale } from "./locales";

/**
 * next-intl server config — the ONE i18n mechanism (§7, D2).
 *
 * No cookie or header is read HERE, deliberately: that would force dynamic
 * rendering everywhere and break the static, SEO-first marketing landing (D6).
 * `requestLocale` resolves only when a caller passes an explicit locale —
 * e.g. `getTranslations({ locale })` in the auth routes' generateMetadata,
 * which resolves it from the ask.locale cookie (D19). Without an explicit
 * locale (the landing, the platform shell) it is undefined and the default
 * serves — so the landing stays static.
 *
 * The CLIENT locale switch (ru/kk/en) scoped to `/app` lives in
 * `shared/i18n/LocaleProvider` (D18/D19) and re-provides messages client-side;
 * it never touches this config. The profile settings screen (UF 2.3) remains
 * the eventual home for the control.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const locale = parseLocale(await requestLocale) ?? defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
