import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LoginPage } from "@/auth";
import { defaultLocale } from "@/shared/i18n/locales";
import { localeFromCookies } from "@/shared/i18n/serverLocale";

/** /app/auth/login → the auth slice's LoginPage. Thin server route; LoginPage is
 *  the client island behind it (D7). The tab title is resolved from the
 *  ask.locale cookie (D19), so it is correct in the initial HTML; the client
 *  effect in LoginPage takes over for in-session locale switches.
 *
 *  `noindex` because this route is CRAWLABLE and must not be a search result.
 *  It is one of exactly two pages under `/app/*` that a logged-out visitor can
 *  reach — the D23 lock names `/app/auth/*` as the ONE exception to the auth
 *  gate — so the "everything under /app needs a session, nothing is crawlable"
 *  reasoning that covers the rest of the tree does not reach here. SEO surfaces
 *  are marketing + legal only (ROADMAP item 10); an indexed login page competes
 *  with the landing for the brand query. */
export async function generateMetadata(): Promise<Metadata> {
  const locale = (await localeFromCookies()) ?? defaultLocale;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("login.pageTitle"), robots: { index: false } };
}

export default function LoginRoute() {
  return <LoginPage />;
}
