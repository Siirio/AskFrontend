import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LoginPage } from "@/auth";
import { defaultLocale } from "@/shared/i18n/locales";
import { localeFromCookies } from "@/shared/i18n/serverLocale";

/** /app/auth/login → the auth slice's LoginPage. Thin server route; LoginPage is
 *  the client island behind it (D7). The tab title is resolved from the
 *  ask.locale cookie (D19), so it is correct in the initial HTML; the client
 *  effect in LoginPage takes over for in-session locale switches. */
export async function generateMetadata(): Promise<Metadata> {
  const locale = (await localeFromCookies()) ?? defaultLocale;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("login.pageTitle") };
}

export default function LoginRoute() {
  return <LoginPage />;
}
