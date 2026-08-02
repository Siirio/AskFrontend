import { Store } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { SectionNotOpen } from "@/app/_components/SectionNotOpen";
import { defaultLocale } from "@/shared/i18n/locales";
import { localeFromCookies } from "@/shared/i18n/serverLocale";

/** /app/business → renders the @/business-cabinet page when that slice lands (roadmap Phase 1 #6).
 *  Until then it states plainly that the section is not open, which is what the
 *  "a reachable control must DO something" lock requires of a live destination
 *  (AUDIT_2 N4). Server component throughout — nothing here is interactive (D7).
 *  Locale resolved from the ask.locale cookie (D19) — see the /app route for why. */
export default async function BusinessRoute() {
  const locale = (await localeFromCookies()) ?? defaultLocale;
  const t = await getTranslations({ locale, namespace: "app" });

  return (
    <SectionNotOpen
      icon={Store}
      title={t("notOpen.business.title")}
      description={t("notOpen.business.description")}
    />
  );
}
