import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";

import { AppProviders } from "@/app/providers/AppProviders";

import "./globals.css";

export const metadata: Metadata = {
  title: "ASK",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
