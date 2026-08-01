import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BusinessRegisterPage } from "@/business-cabinet";
import { defaultLocale } from "@/shared/i18n/locales";
import { localeFromCookies } from "@/shared/i18n/serverLocale";

/**
 * /app/business/register → the business-cabinet slice's registration page
 * (PRODUCT_VISION UF 3.1). Thin server route; BusinessRegisterPage is the client
 * island behind it (D7).
 *
 * PLACEMENT, which is the access decision: inside `(main)`, so RequireAuth still
 * demands a session — and OUTSIDE `business/(cabinet)/`, which is the group
 * carrying RequireDashboardAccess. A customer must reach this page because they
 * are not a seller yet; see the note in `(cabinet)/layout.tsx`.
 *
 * `noindex` because THIS route sits inside `(main)`, so RequireAuth means a
 * crawler never reaches it, and it is not in the sitemap. Stated per-route on
 * purpose: this comment used to read "the whole `/app/*` tree is authenticated",
 * which is false — `/app/auth/*` is logged-out-reachable by design (the D23
 * lock's one exception), and generalising from here is what left the two auth
 * routes without the tag until 2026-08-02. Placement is the access decision, so
 * the crawlability reason is placement too — never a claim about `/app/*`.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = (await localeFromCookies()) ?? defaultLocale;
  const t = await getTranslations({ locale, namespace: "businessCabinet" });
  return { title: t("register.pageTitle"), robots: { index: false } };
}

export default function BusinessRegisterRoute() {
  return <BusinessRegisterPage />;
}
