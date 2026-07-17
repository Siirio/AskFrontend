export const locales = ["ru", "kk", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ru";

/** localStorage AND cookie key for the stored platform locale (D18/D19).
 *  Lives here (a plain module) so server code can import it too. */
export const LOCALE_STORAGE_KEY = "ask.locale";
