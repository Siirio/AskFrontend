import type { ReactNode } from "react";
import { cookies } from "next/headers";

import { RoleSelectionModal } from "@/auth";
import { LocaleProvider } from "@/shared/i18n/LocaleProvider";
import { localeFromCookies } from "@/shared/i18n/serverLocale";
import { parseThemePreference, THEME_STORAGE_KEY } from "@/shared/theme";
import { Toaster } from "@/shared/ui/sonner";
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
 *
 * RoleSelectionModal IS here — it follows the session, not a route: the
 * undismissable role choice must hold on EVERY /app/* surface, including the
 * auth routes outside `(main)` (mounting it only there left a route-shaped
 * escape via browser-back to /app/auth/*, found in review 2026-07-18).
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
      <ThemePreferenceSeed value={theme}>
        {/* `neu-skin` is the ONE place the neumorphic direction is applied
            (D25). Everything below it — auth included — is neumorphic by
            construction, and the marketing landing, which is not below it,
            cannot become neumorphic by accident. Same principle as the `(main)`
            group being the auth gate line: placement IS status. The class
            carries the palette AND `min-height: 100svh`, so a short page still
            paints the warm surface edge to edge. */}
        <div className="neu-skin">
          {children}
          <RoleSelectionModal />
          {/* The sonner host — INSIDE the seed so an explicit dark preference
              hydrates dark (D21). Toasts are platform feedback; the static
              landing has none and must not read the cookie this seed needs.
              INSIDE `neu-skin` too, and that placement is load-bearing: sonner
              renders its host in place rather than portaling, so its CSS
              variables (sonner.tsx) resolve against whatever scope encloses it
              — mounted outside, every toast would silently take the MARKETING
              palette. The role modal is a Radix dialog and does portal out; it
              picks the skin up via `data-neu-portal` (see dialog.tsx) and sits
              here only for tidiness. */}
          <Toaster />
        </div>
      </ThemePreferenceSeed>
    </LocaleProvider>
  );
}
