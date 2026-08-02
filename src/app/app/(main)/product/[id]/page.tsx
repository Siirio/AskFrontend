import { Package } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { SectionNotOpen } from "@/app/_components/SectionNotOpen";
import { defaultLocale } from "@/shared/i18n/locales";
import { localeFromCookies } from "@/shared/i18n/serverLocale";

/** /app/product/:id → renders the @/catalog ProductCard as a full page (D10)
 *  when the catalog slice lands (roadmap Phase 1 #3). [server, D7]
 *
 *  This route's copy differs from its three siblings on purpose. They are "not
 *  open yet"; this one may never open in this form — D10's deep link is
 *  DEFERRED because there is no public item read on the backend (the security
 *  allowlist carries no item endpoint, cross-repo table). The Product Card
 *  ships as a modal rendered from the search payload, so the honest message
 *  points at where the card actually lives rather than promising this URL.
 *
 *  The `id` is deliberately no longer echoed: printing a raw route parameter
 *  told the visitor nothing and read as debug output left in a shipped page.
 *  Locale resolved from the ask.locale cookie (D19) — see the /app route for why. */
export default async function ProductRoute() {
  const locale = (await localeFromCookies()) ?? defaultLocale;
  const t = await getTranslations({ locale, namespace: "app" });

  return (
    <SectionNotOpen
      icon={Package}
      title={t("notOpen.product.title")}
      description={t("notOpen.product.description")}
    />
  );
}
