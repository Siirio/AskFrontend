"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * App chrome (§2): the navigation menu from PRODUCT_VISION UF 2.1–2.3.
 * Structure only — visual styling arrives with a later slice.
 *
 * Client component so it re-renders when the platform locale is switched (the
 * LocaleProvider in the platform layout). A server component would stay frozen
 * on the server locale while the page content switched — an inconsistent mix.
 */
export function NavigationMenu() {
  const t = useTranslations("app.nav");

  return (
    <nav>
      <ul>
        <li>
          <Link href="/app">{t("home")}</Link>
        </li>
        <li>
          <Link href="/app/chats">{t("chats")}</Link>
        </li>
        <li>
          <Link href="/app/profile">{t("profile")}</Link>
        </li>
        <li>
          <Link href="/app/business">{t("business")}</Link>
        </li>
      </ul>
    </nav>
  );
}
