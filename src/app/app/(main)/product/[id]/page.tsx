import { Package } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SectionNotOpen } from "@/app/_components/SectionNotOpen";
import { defaultLocale } from "@/shared/i18n/locales";
import { localeFromCookies } from "@/shared/i18n/serverLocale";
import { Button } from "@/shared/ui/button";

/** /app/product/:id → a PERMANENT informational stub. [server, D7]
 *
 *  This route's copy differs from its three siblings on purpose. They say
 *  "not open yet"; this one will never open in the full-page form D10
 *  originally planned — **D33 (2026-08-06) reverses that half of D10**: the
 *  Product Card is modal-only, permanently, regardless of whether a public
 *  item-read endpoint ever ships. The honest message points at where the
 *  card actually lives (the catalog) rather than promising this URL, and
 *  offers a direct way back there instead of a dead end.
 *
 *  The `id` is deliberately not echoed: printing a raw route parameter told
 *  the visitor nothing and read as debug output left in a shipped page.
 *  Locale resolved from the ask.locale cookie (D19) — see the /app route for why. */
export default async function ProductRoute() {
  const locale = (await localeFromCookies()) ?? defaultLocale;
  const t = await getTranslations({ locale, namespace: "app" });

  return (
    <SectionNotOpen
      icon={Package}
      title={t("notOpen.product.title")}
      description={t("notOpen.product.description")}
      action={
        <Button asChild>
          <Link href="/app/catalog">{t("notOpen.product.backToCatalog")}</Link>
        </Button>
      }
    />
  );
}
