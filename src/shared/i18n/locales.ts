export const locales = ["kk", "ru", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "kk";

/** localStorage AND cookie key for the stored platform locale (D18/D19).
 *  Lives here (a plain module) so server code can import it too. */
export const LOCALE_STORAGE_KEY = "ask.locale";

/**
 * Validate a stored/requested locale value (cookie, localStorage, next-intl
 * request) — the ONE representation of "what counts as a supported locale"
 * (P6.2). Undefined means "no valid preference"; the caller picks its own
 * fallback (defaultLocale, or letting a provider default apply).
 */
export function parseLocale(
  value: string | null | undefined,
): Locale | undefined {
  return (locales as readonly string[]).includes(value ?? "")
    ? (value as Locale)
    : undefined;
}
