import type { ReactNode } from "react";
import { cookies } from "next/headers";

import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { localeFromCookies } from "@/shared/i18n/serverLocale";
import { parseThemePreference, THEME_STORAGE_KEY } from "@/shared/theme";
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
  const locale = await localeFromCookies();
  const theme = parseThemePreference(
    (await cookies()).get(THEME_STORAGE_KEY)?.value,
  );

  return (
    <LocaleProvider initialLocale={locale}>
      <ThemePreferenceSeed value={theme}>{children}</ThemePreferenceSeed>
    </LocaleProvider>
  );
}
