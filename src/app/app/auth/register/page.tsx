import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

import { RegisterPage } from "@/auth";
import {
  defaultLocale,
  LOCALE_STORAGE_KEY,
  locales,
} from "@/shared/i18n/locales";

/** /app/auth/register → the auth slice's RegisterPage. Thin server route;
 *  RegisterPage is the client island behind it (D7). The tab title is resolved
 *  from the ask.locale cookie (D19), so it is correct in the initial HTML; the
 *  client effect in RegisterPage takes over for in-session locale switches. */
export async function generateMetadata(): Promise<Metadata> {
  const raw = (await cookies()).get(LOCALE_STORAGE_KEY)?.value ?? "";
  const locale = (locales as readonly string[]).includes(raw)
    ? raw
    : defaultLocale;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("register.pageTitle") };
}

export default function RegisterRoute() {
  return <RegisterPage />;
}
