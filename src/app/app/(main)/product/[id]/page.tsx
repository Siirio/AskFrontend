import { getTranslations } from "next-intl/server";

import { defaultLocale } from "@/shared/i18n/locales";
import { localeFromCookies } from "@/shared/i18n/serverLocale";

/** /app/product/:id → renders the @/catalog ProductCard as a full page (D10) when the catalog slice lands (roadmap Phase 1 #3). [server, D7]
 *  Locale resolved from the ask.locale cookie (D19) — see the /app route for why. */
export default async function ProductRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = (await localeFromCookies()) ?? defaultLocale;
  const t = await getTranslations({ locale, namespace: "app" });

  return (
    <main>
      <h1>{t("pages.product")}</h1>
      <p>{id}</p>
      <p>{t("placeholder")}</p>
    </main>
  );
}
