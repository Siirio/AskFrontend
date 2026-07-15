import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Golos_Text } from "next/font/google";
import { getLocale } from "next-intl/server";

import { AppProviders } from "@/app/providers/AppProviders";

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
  title: "Ask",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={golos.variable}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
