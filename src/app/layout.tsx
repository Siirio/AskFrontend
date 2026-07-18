import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Golos_Text } from "next/font/google";
import { getLocale, setRequestLocale } from "next-intl/server";

import { AppProviders } from "@/app/providers/AppProviders";
import { SITE_NAME, TITLE_TEMPLATE } from "@/shared/config/site";
import { defaultLocale } from "@/shared/i18n/locales";

import "./globals.css";

/*
 * Golos Text — the rationale is in design-system/tokens.css (--font-sans).
 *
 * The subset list is NOT boilerplate, and dropping one breaks the product:
 *   cyrillic + cyrillic-ext — Russian, and the Kazakh letters (ә ғ қ ң ө ұ ү һ і),
 *     which are split across BOTH ranges.
 *   latin-ext — carries ₸, the TENGE SIGN (U+20B8). It is NOT in either Cyrillic
 *     range. Load only the Cyrillic subsets, as a ru/kk product invites you to,
 *     and every price on the platform silently falls back to a system font.
 */
const golos = Golos_Text({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-golos",
  display: "swap",
});

export const metadata: Metadata = {
  // Pages set a bare title; the template brands it ("Log in — Ask"). Routes
  // without one (the landing) fall back to the default. The template string
  // lives in shared/config/site.ts — the client title writers derive from the
  // same source (P6.2).
  title: { template: TITLE_TEMPLATE, default: SITE_NAME },
};

/*
 * Applies the stored theme to <html> BEFORE first paint, so there is no flash of
 * the wrong theme. Mirrors shared/theme.ts (an inline script cannot import it):
 * read `ask.theme`; "system" (or absent) resolves the OS preference into a
 * concrete light/dark attribute. `data-theme` is what design-system/tokens.css
 * reads. `suppressHydrationWarning` on <html> is required because this mutates
 * the attribute before React hydrates.
 */
const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem('ask.theme');var t=(p==='light'||p==='dark')?p:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Seed next-intl's request locale so the marketing landing at `/` renders
  // STATICALLY (D6). getLocale/getMessages/getTranslations are treated as
  // dynamic until the locale is seeded; without this the whole tree — the
  // landing included — is opted into dynamic rendering, which is what defeated
  // the D6 static-landing lock (2026-07-18 review: `/` shipped as ƒ, not ○).
  // The server always serves defaultLocale; the /app locale switch is
  // client-side (D18) and the platform layout still reads cookies, so /app/*
  // stays dynamic as D19 intends.
  setRequestLocale(defaultLocale);

  const locale = await getLocale();

  return (
    <html lang={locale} className={golos.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
