import type { ReactNode } from "react";
import { cookies } from "next/headers";

import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import {
  LOCALE_STORAGE_KEY,
  locales,
  type Locale,
} from "@/shared/i18n/locales";
import { THEME_STORAGE_KEY, type ThemePreference } from "@/shared/theme";
import { ThemePreferenceSeed } from "@/shared/ui/theme-toggle";

/**
 * Platform shell wrapping every /app/* page (§2, D6). Server component (D7).
 *
 * It reads the `ask.locale` and `ask.theme` preference COOKIES (D19) and seeds
 * the client providers, so every /app/* page server-renders in the stored
 * language with the stored theme preference highlighted — no default-locale
 * flash on reload. This makes /app/* dynamically rendered; the marketing
 * landing at `/` never reads a cookie and stays static (the D6 lock).
 *
 * The navigation menu is NOT here — it lives in the `(main)` route group's
 * layout, so the auth pages (which sit outside that group) render standalone,
 * without the app nav, while still getting the locale switch.
 */
export default async function PlatformLayout({
  children,
}: {
  children: ReactNode;
}) {
  const jar = await cookies();

  const rawLocale = jar.get(LOCALE_STORAGE_KEY)?.value ?? "";
  const locale = (locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : undefined;

  const rawTheme = jar.get(THEME_STORAGE_KEY)?.value;
  const theme: ThemePreference =
    rawTheme === "light" || rawTheme === "dark" ? rawTheme : "system";

  return (
    <LocaleProvider initialLocale={locale}>
      <ThemePreferenceSeed value={theme}>{children}</ThemePreferenceSeed>
    </LocaleProvider>
  );
}
