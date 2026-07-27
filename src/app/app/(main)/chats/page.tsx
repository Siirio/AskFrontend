import { getTranslations } from "next-intl/server";

import { defaultLocale } from "@/shared/i18n/locales";
import { localeFromCookies } from "@/shared/i18n/serverLocale";

/** /app/chats → renders the @/chats page when the chats slice lands (roadmap Phase 1 #4). [client page behind this server route file, D7]
 *  Locale resolved from the ask.locale cookie (D19) — see the /app route for why. */
export default async function ChatsRoute() {
  const locale = (await localeFromCookies()) ?? defaultLocale;
  const t = await getTranslations({ locale, namespace: "app" });

  return (
    <main>
      <h1>{t("pages.chats")}</h1>
      <p>{t("placeholder")}</p>
    </main>
  );
}
