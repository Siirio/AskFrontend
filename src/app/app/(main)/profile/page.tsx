import { Settings } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { SectionNotOpen } from "@/app/_components/SectionNotOpen";
import { defaultLocale } from "@/shared/i18n/locales";
import { localeFromCookies } from "@/shared/i18n/serverLocale";

/** /app/profile → renders the @/profile page when that slice lands (roadmap Phase 1 #5).
 *  Until then it states plainly that the section is not open, which is what the
 *  "a reachable control must DO something" lock requires of a live destination
 *  (AUDIT_2 N4). Server component throughout — nothing here is interactive (D7).
 *  Locale resolved from the ask.locale cookie (D19) — see the /app route for why. */
export default async function ProfileRoute() {
  const locale = (await localeFromCookies()) ?? defaultLocale;
  const t = await getTranslations({ locale, namespace: "app" });

  return (
    <SectionNotOpen
      icon={Settings}
      title={t("notOpen.profile.title")}
      description={t("notOpen.profile.description")}
    />
  );
}
