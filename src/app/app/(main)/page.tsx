import { getTranslations } from "next-intl/server";

import { defaultLocale } from "@/shared/i18n/locales";
import { localeFromCookies } from "@/shared/i18n/serverLocale";

/** /app → renders @/search HomePage when the search slice lands (roadmap Phase 1 #2). [server, D7]
 *  Locale resolved from the ask.locale cookie (D19), like the auth routes'
 *  generateMetadata — getTranslations("app") alone always falls back to
 *  defaultLocale (shared/i18n/request.ts never reads the cookie itself),
 *  which left this placeholder stuck in kk regardless of the user's actual
 *  locale switch (found 2026-07-27). */
export default async function HomeRoute() {
  const locale = (await localeFromCookies()) ?? defaultLocale;
  const t = await getTranslations({ locale, namespace: "app" });

  return (
    <main>
      <h1>{t("pages.home")}</h1>
      <p>{t("placeholder")}</p>
    </main>
  );
}
