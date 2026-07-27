"use client";

/*
 * ARCHIVED — the pre-neumorphism skin, kept verbatim (owner directive
 * 2026-07-27). Nothing live imports it; its collaborators are the other *_old
 * files, so the set reads as a consistent whole. A SNAPSHOT, not a
 * component: do not edit it, and do not fix it up when the live file changes.
 * The live skin is design-system/neumorphism.css + the un-suffixed sibling.
 */

import { useSyncExternalStore } from "react";
import { Toaster as Sonner, toast, type ToasterProps } from "sonner";

import { getResolvedTheme, subscribeTheme } from "@/shared/theme";
import { useThemePreferenceSeed } from "@/shared/ui/theme-toggle_old";

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
  // SSR/hydration snapshot from the cookie seed where one wraps the tree
  // (/app/*, D19) — an explicit "dark" preference hydrates dark instead of
  // flashing a light toast host on a dark page. "system" cannot know the OS
  // server-side and stays light, like the toggle's own seed path.
  const seed = useThemePreferenceSeed();
  const theme = useSyncExternalStore(subscribeTheme, getResolvedTheme, () =>
    seed === "dark" ? ("dark" as const) : ("light" as const),
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
