"use client";

/*
 * ARCHIVED — the pre-neumorphism skin, kept verbatim (owner directive
 * 2026-07-27). Nothing live imports it; its collaborators are the other *_old
 * files, so the set reads as a consistent whole. A SNAPSHOT, not a
 * component: do not edit it, and do not fix it up when the live file changes.
 * The live skin is design-system/neumorphism.css + the un-suffixed sibling.
 */

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { useLocale } from "@/shared/i18n/LocaleProvider";
import { locales, type Locale } from "@/shared/i18n/locales";

/**
 * kk / ru / en switcher — domain-free chrome (shared/ui). Reads and writes the
 * platform locale via the LocaleProvider (shared/i18n). Language names are
 * endonyms (shown in their own language, not translated); only the group label
 * is localised. Like the theme toggle, the active option is a quiet sunken fill
 * — the accent is reserved for the focus ring (saturation-is-action).
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
    <div
      role="group"
      aria-label={t("language.label")}
      className="inline-flex items-center gap-0.5 rounded-sm border border-border bg-surface-raised p-0.5"
    >
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
              // compact 32px only where a fine pointer (mouse/trackpad) is primary.
              "inline-flex h-11 min-w-11 items-center justify-center rounded-xs px-3 text-xs font-medium focus-ring transition-colors pointer-fine:h-8 pointer-fine:min-w-0 pointer-fine:px-2",
              active
                ? "bg-surface-sunken text-foreground"
                : "text-foreground-subtle hover:text-foreground",
            )}
          >
            {LABELS[code].code}
          </button>
        );
      })}
    </div>
  );
}
