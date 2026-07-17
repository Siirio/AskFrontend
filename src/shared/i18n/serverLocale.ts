import { cookies } from "next/headers";

import { LOCALE_STORAGE_KEY, parseLocale, type Locale } from "./locales";

/**
 * Server-side read of the `ask.locale` preference cookie (D19) — the ONE place
 * the cookie becomes a validated Locale (P6.2). The platform layout seeds
 * LocaleProvider with it; the auth routes' generateMetadata resolves the tab
 * title from it. Undefined = no valid preference (caller falls back).
 *
 * Reading cookies makes the calling route dynamically rendered — never import
 * this from the marketing landing, which must stay static (D6 lock).
 */
export async function localeFromCookies(): Promise<Locale | undefined> {
  return parseLocale((await cookies()).get(LOCALE_STORAGE_KEY)?.value);
}
