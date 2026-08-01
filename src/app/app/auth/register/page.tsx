import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { RegisterPage } from "@/auth";
import { defaultLocale } from "@/shared/i18n/locales";
import { localeFromCookies } from "@/shared/i18n/serverLocale";

/** /app/auth/register → the auth slice's RegisterPage. Thin server route;
 *  RegisterPage is the client island behind it (D7). The tab title is resolved
 *  from the ask.locale cookie (D19), so it is correct in the initial HTML; the
 *  client effect in RegisterPage takes over for in-session locale switches.
 *
 *  `noindex` for the same reason as the sibling login route: `/app/auth/*` is
 *  the D23 lock's ONE logged-out-reachable exception under `/app`, so this page
 *  really is crawlable and the blanket "/app is gated" reasoning does not cover
 *  it. SEO surfaces are marketing + legal only (ROADMAP item 10). */
export async function generateMetadata(): Promise<Metadata> {
  const locale = (await localeFromCookies()) ?? defaultLocale;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("register.pageTitle"), robots: { index: false } };
}

export default function RegisterRoute() {
  return <RegisterPage />;
}
