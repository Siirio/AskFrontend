import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { defaultLocale } from "@/shared/i18n/locales";

/**
 * Cookies page — a legal page (owner rule 3): reachable without a session, so it
 * lives OUTSIDE /app, beyond the platform guard. Content-only + static (D6),
 * same shape as the Terms route. The real text is owner-authored (P9.1); the
 * body is a neutral placeholder until it lands (P9.3). Linked from the account
 * menu.
 */
export async function generateMetadata(): Promise<Metadata> {
  setRequestLocale(defaultLocale);
  const t = await getTranslations("marketing.legal");
  return { title: t("cookies.title") };
}

export default async function CookiesPage() {
  setRequestLocale(defaultLocale);
  const t = await getTranslations("marketing.legal");

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-semibold text-foreground">
        {t("cookies.title")}
      </h1>
      <p className="mt-4 text-foreground-muted">{t("preparing")}</p>
    </main>
  );
}
