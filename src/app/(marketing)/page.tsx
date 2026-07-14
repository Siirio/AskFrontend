import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * Landing Page (UF 1) — content only (D6): imports shared/ and design-system/
 * only, never a slice; no api/model/store. Placeholder structure; the real
 * landing content is roadmap Phase 1 item 10.
 */
export default async function LandingPage() {
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
