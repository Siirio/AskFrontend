import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { defaultLocale } from "@/shared/i18n/locales";

/**
 * Landing Page (UF 1) — content only (D6): imports shared/ and design-system/
 * only, never a slice; no api/model/store. Placeholder structure; the real
 * landing content is roadmap Phase 1 item 10.
 *
 * setRequestLocale keeps this route STATIC (D6): next-intl treats
 * getTranslations as dynamic until the request locale is seeded. next-intl
 * requires the seed at EVERY static entry point (this page as well as the root
 * layout), not only an ancestor — so it is repeated here deliberately.
 */
export default async function LandingPage() {
  setRequestLocale(defaultLocale);
  const t = await getTranslations("marketing");

  return (
    <main>
      <h1>{t("title")}</h1>
      <p>
        <Link href="/app">{t("openApp")}</Link>
      </p>
    </main>
  );
}
