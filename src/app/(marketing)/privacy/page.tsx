import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { defaultLocale } from "@/shared/i18n/locales";

/**
 * Privacy Policy — a legal page (owner rule 3): reachable without a session, so
 * it lives OUTSIDE /app, beyond the platform guard. Content-only + static (D6),
 * same shape as the Terms route. The real text is owner-authored (P9.1); the
 * body is a neutral placeholder until it lands (P9.3). Linked from the register
 * agreement and the account menu.
 */
export async function generateMetadata(): Promise<Metadata> {
  setRequestLocale(defaultLocale);
  const t = await getTranslations("marketing.legal");
  // `noindex` WHILE the body is a placeholder: the register consent links point
  // here, so a "being prepared" page must never be crawled or cached as the real
  // Privacy Policy. Remove `robots` the moment the owner's final copy lands
  // (P9.1) — that is also when the page becomes an SEO surface (ROADMAP launch gate).
  return { title: t("privacy.title"), robots: { index: false } };
}

export default async function PrivacyPage() {
  setRequestLocale(defaultLocale);
  const t = await getTranslations("marketing.legal");

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-semibold text-foreground">
        {t("privacy.title")}
      </h1>
      <p className="mt-4 text-foreground-muted">{t("preparing")}</p>
    </main>
  );
}
