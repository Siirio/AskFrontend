import { getTranslations } from "next-intl/server";

import { defaultLocale } from "@/shared/i18n/locales";
import { localeFromCookies } from "@/shared/i18n/serverLocale";

/** /app/catalog → renders @/search CatalogPage when the search slice lands (roadmap Phase 1 #2). [server, D7]
 *  Locale resolved from the ask.locale cookie (D19) — see the /app route for why. */
export default async function CatalogRoute() {
  const locale = (await localeFromCookies()) ?? defaultLocale;
  const t = await getTranslations({ locale, namespace: "app" });

  return (
    <main>
      <h1>{t("pages.catalog")}</h1>
      <p>{t("placeholder")}</p>
    </main>
  );
}
