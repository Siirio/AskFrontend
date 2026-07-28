import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { HomePage } from "@/search";
import { defaultLocale } from "@/shared/i18n/locales";
import { localeFromCookies } from "@/shared/i18n/serverLocale";

/** /app → the search slice's Home (PRODUCT_VISION UF 2.1 step 1). Thin server
 *  route; HomePage is a server component with a client SearchForm island
 *  (D7). Locale resolved from the ask.locale cookie (D19) for both the tab
 *  title and the page content — getTranslations(namespace) alone always
 *  falls back to defaultLocale (shared/i18n/request.ts never reads the
 *  cookie itself). */
export async function generateMetadata(): Promise<Metadata> {
  const locale = (await localeFromCookies()) ?? defaultLocale;
  const t = await getTranslations({ locale, namespace: "app" });
  return { title: t("pages.home") };
}

export default async function HomeRoute() {
  const locale = (await localeFromCookies()) ?? defaultLocale;
  return <HomePage locale={locale} />;
}
