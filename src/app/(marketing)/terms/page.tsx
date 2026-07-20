import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { defaultLocale } from "@/shared/i18n/locales";

/**
 * Terms of Service — a legal page (owner rule 3): the pages every visitor may
 * read WITHOUT a session live OUTSIDE /app, so the platform guard never touches
 * them. Content-only (D6): imports shared/ + design-system only, never a slice;
 * static (setRequestLocale seeds the locale at every static entry point — page
 * AND generateMetadata — so the route prerenders, D6).
 *
 * The real legal text is the owner's to write, never invented client-side
 * (P9.1); until it lands the body shows a neutral "being prepared" placeholder
 * (P9.3). The register agreement and the account menu already link here.
 */
export async function generateMetadata(): Promise<Metadata> {
  setRequestLocale(defaultLocale);
  const t = await getTranslations("marketing.legal");
  // `noindex` WHILE the body is a placeholder: keeps the page out of search
  // results, so a "being prepared" page is never surfaced as the real Terms of
  // Service (the register consent links point here). Remove `robots` the moment
  // the owner's final copy lands (P9.1) — that is also when the page becomes an
  // SEO surface (ROADMAP launch gate).
  return { title: t("terms.title"), robots: { index: false } };
}

export default async function TermsPage() {
  setRequestLocale(defaultLocale);
  const t = await getTranslations("marketing.legal");

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-semibold text-foreground">
        {t("terms.title")}
      </h1>
      <p className="mt-4 text-foreground-muted">{t("preparing")}</p>
    </main>
  );
}
