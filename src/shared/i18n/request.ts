import { getRequestConfig } from "next-intl/server";

import { defaultLocale, parseLocale } from "./locales";

/**
 * next-intl server config — the ONE i18n mechanism (§7, D2).
 *
 * No cookie or header is read HERE, deliberately: that would force dynamic
 * rendering everywhere and break the static, SEO-first marketing landing (D6).
 * `requestLocale` resolves from whatever the caller seeded — `setRequestLocale`
 * at a static entry point (root layout + the landing page), or an explicit
 * locale like `getTranslations({ locale })` in the auth routes'
 * generateMetadata, which resolves it from the ask.locale cookie (D19).
 *
 * Not reading a cookie here is NECESSARY for a static landing but not
 * SUFFICIENT: next-intl still treats getLocale/getMessages/getTranslations as
 * dynamic until a request locale is seeded. `setRequestLocale(defaultLocale)`
 * at the static entry points is what actually keeps `/` static (added
 * 2026-07-18 after the build shipped `/` as ƒ despite this care).
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
