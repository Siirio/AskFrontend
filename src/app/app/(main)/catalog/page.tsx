import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  CatalogPage,
  parseCatalogSearchParams,
  search,
  toSearchRequest,
} from "@/search";
import { defaultLocale } from "@/shared/i18n/locales";
import { localeFromCookies } from "@/shared/i18n/serverLocale";

/** /app/catalog → the search slice's Catalog Page (PRODUCT_VISION UF 2.1 step
 *  2). The route file owns the ONE server-side call: it parses the URL's
 *  filter/sort params into a SearchRequest and calls `search()` directly
 *  (D7, P1.2) — CatalogPage itself only renders the outcome. A failed call
 *  becomes an `error` prop rather than throwing, so the mandatory error
 *  state (P9.3) renders instead of the framework's generic error boundary.
 *  Locale resolved from the ask.locale cookie (D19) — see the /app route for
 *  why. */
export async function generateMetadata(): Promise<Metadata> {
  const locale = (await localeFromCookies()) ?? defaultLocale;
  const t = await getTranslations({ locale, namespace: "app" });
  return { title: t("pages.catalog") };
}

export default async function CatalogRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = parseCatalogSearchParams(raw);
  const locale = (await localeFromCookies()) ?? defaultLocale;

  // `rawQuery` is `@NotBlank` on the backend (contracts.md). The search
  // form already refuses to submit an empty query, but this route is
  // reachable directly (a typed/bookmarked/edited URL), so the guard
  // belongs here too — never send a request known to fail (P9.4), and never
  // spend a round trip just to land on the generic error state.
  if (!params.query?.trim()) {
    return <CatalogPage locale={locale} params={params} emptyQuery />;
  }

  try {
    const response = await search(toSearchRequest(params, locale));
    return <CatalogPage locale={locale} params={params} response={response} />;
  } catch {
    return <CatalogPage locale={locale} params={params} error />;
  }
}
