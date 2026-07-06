import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "kk", label: "KK" },
] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div
      className="fcw-flex fcw-items-center"
      style={{
        gap: 0,
        padding: "0.125rem",
        borderRadius: "var(--fcw-radius-md)",
        background: "color-mix(in srgb, var(--fcw-color-surface-secondary) 60%, transparent)",
      }}
      role="radiogroup"
      aria-label="Select language"
    >
      {LANGUAGES.map(({ code, label }) => {
        const active = i18n.language === code || (code === "ru" && !i18n.language);
        return (
          <button
            key={code}
            className="fcw-label"
            role="radio"
            aria-checked={active}
            onClick={() => i18n.changeLanguage(code)}
            style={{
              background: active ? "var(--fcw-color-surface)" : "transparent",
              color: active ? "var(--fcw-color-primary)" : "var(--fcw-color-text-tertiary)",
              fontWeight: active ? "var(--fcw-font-weight-semibold)" : "var(--fcw-font-weight-regular)",
              borderRadius: "calc(var(--fcw-radius-md) - 0.125rem)",
              border: "none",
              cursor: "pointer",
              padding: "0.125rem 0.375rem",
              fontSize: "0.6875rem",
              letterSpacing: "0.04em",
              lineHeight: 1.5,
              transition: "all 150ms var(--fcw-ease-out)",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
