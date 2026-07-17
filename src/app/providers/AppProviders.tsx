import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { AuthProvider } from "@/auth";
import { Toaster } from "@/shared/ui/sonner";
import { ThemeSystemSync } from "@/shared/ui/theme-system-sync";

/**
 * Mounts app-wide providers (R3). Context objects and their consumer hooks
 * are DEFINED in their owning slices (R6, P5.3) — this file only mounts.
 *
 * The auth session context (defined in @/auth) wraps the tree so every slice
 * can read the current user via useAuth. The Toaster (the sonner host) is
 * mounted here now that auth is its first real consumer — Phase 0b deferred it
 * to exactly this moment.
 */
export async function AppProviders({ children }: { children: ReactNode }) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider>{children}</AuthProvider>
      <Toaster />
      <ThemeSystemSync />
    </NextIntlClientProvider>
  );
}
