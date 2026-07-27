"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { useLocale } from "@/shared/i18n/LocaleProvider";
import { locales, type Locale } from "@/shared/i18n/locales";

/**
 * kk / ru / en switcher — domain-free chrome (shared/ui). Reads and writes the
 * platform locale via the LocaleProvider (shared/i18n). Language names are
 * endonyms (shown in their own language, not translated); only the group label
 * is localised.
 *
 * Same shape as the theme toggle on ORANGE NEUMORPHISM (D25) — deliberately, so
 * the pair reads as one control strip: an inset groove whose active option
 * presses IN and takes the accent on its label. Depth carries the state; the
 * accent tints three characters and nothing more.
 */
const LABELS: Record<Locale, { code: string; name: string }> = {
  kk: { code: "KK", name: "Қазақша" },
  ru: { code: "RU", name: "Русский" },
  en: { code: "EN", name: "English" },
};

export function LanguageSwitcher() {
  const t = useTranslations("common");
  const { locale, setLocale } = useLocale();

  return (
    <div role="group" aria-label={t("language.label")} className="neu-tab-list">
      {locales.map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            data-testid={`locale-${code}`}
            aria-pressed={active}
            aria-label={LABELS[code].name}
            title={LABELS[code].name}
            onClick={() => setLocale(code)}
            className={cn(
              // 44px touch target on coarse pointers (platform-ui-design §7);
              // compact only where a fine pointer (mouse/trackpad) is primary.
              // `.neu-tab-trigger` reads aria-pressed itself for the pressed-in
              // active state, so no conditional class is needed for depth.
              "neu-tab-trigger inline-flex h-11 min-w-11 items-center justify-center px-3 text-xs focus-ring pointer-fine:h-9 pointer-fine:min-w-0 pointer-fine:px-2.5",
              !active && "hover:text-foreground",
            )}
          >
            {LABELS[code].code}
          </button>
        );
      })}
    </div>
  );
}
