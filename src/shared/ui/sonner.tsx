"use client";

import { useSyncExternalStore } from "react";
import { Toaster as Sonner, toast, type ToasterProps } from "sonner";

import { getResolvedTheme, subscribeTheme } from "@/shared/theme";

/*
 * The Toast primitive, on sonner (the sanctioned toast; §7 single
 * implementation). NOT the shadcn scaffold: that wrapper reads the theme from
 * `next-themes`, a theme-management library ASK deliberately refuses (D14/D17)
 * — our theme is the `data-theme` attribute resolved by shared/theme.ts. The
 * Toaster subscribes to exactly that mechanism (D21): `theme="system"` (the
 * pre-D17 wiring) would have re-resolved the OS directly — a second theme
 * path that disagreed with the toggle whenever the user's choice differed
 * from the OS. Every surface colour is bound to a design-system token via
 * sonner's CSS variables (P9.2) — no raw values, no shadcn defaults.
 *
 * Toasts are FEEDBACK only (a saved change, a failed request). They are never a
 * trust signal and never carry an offer — those live on the card as tint, not
 * as transient chrome.
 */
function Toaster(props: ToasterProps) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getResolvedTheme,
    () => "light" as const,
  );

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--surface-raised)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border-strong)",
          "--border-radius": "var(--radius-sm)",
          "--success-bg": "var(--surface-raised)",
          "--success-text": "var(--success)",
          "--success-border": "var(--border-strong)",
          "--error-bg": "var(--surface-raised)",
          "--error-text": "var(--destructive)",
          "--error-border": "var(--border-strong)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster, toast };
