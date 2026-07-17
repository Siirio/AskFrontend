"use client";

import { useEffect } from "react";

import {
  ensureSystemThemeListener,
  getThemePreference,
  syncThemeCookie,
} from "@/shared/theme";

/**
 * Headless chrome: binds the OS-theme change listener app-wide, so a
 * "system" preference re-resolves `data-theme` on a mid-session OS switch on
 * EVERY page — not only where a ThemeToggle happens to be mounted (which was
 * the only thing binding it before). Renders nothing; mounted once by
 * app/providers (defined here, mounted there — R3/P5.3). The initial resolve
 * is still the pre-paint script in app/layout.tsx (D17).
 */
export function ThemeSystemSync() {
  useEffect(() => {
    ensureSystemThemeListener();
    // Reconcile the server's cookie copy with the stored preference (D19) —
    // covers sessions from before the cookie existed.
    syncThemeCookie(getThemePreference());
  }, []);
  return null;
}
