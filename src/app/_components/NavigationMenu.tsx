import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * App chrome (§2): the navigation menu from PRODUCT_VISION UF 2.1–2.3.
 * Structure only — visual styling arrives with the design-system tokens
 * (Phase 0b); P9.2 forbids visual values before then.
 */
export async function NavigationMenu() {
  const t = await getTranslations("app.nav");

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
