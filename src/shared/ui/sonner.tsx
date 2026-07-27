"use client";

import { useSyncExternalStore } from "react";
import { Toaster as Sonner, toast, type ToasterProps } from "sonner";

import { getResolvedTheme, subscribeTheme } from "@/shared/theme";
import { useThemePreferenceSeed } from "@/shared/ui/theme-toggle";

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
      // Every surface colour is bound to a design-system variable (P9.2). On
      // ORANGE NEUMORPHISM (D25) a toast is a RAISED tile: one surface colour,
      // no border (`transparent`, not `none` — sonner sets a border width
      // regardless, so a colour is what removes the line), the skin's 16px
      // radius, and depth from --neu-raised-sm. These variables are resolved
      // where this host is MOUNTED, which is why the platform layout keeps it
      // inside the `neu-skin` wrapper — see the comment there.
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "transparent",
          "--border-radius": "16px",
          "--success-bg": "var(--surface)",
          "--success-text": "var(--success)",
          "--success-border": "transparent",
          "--error-bg": "var(--surface)",
          "--error-text": "var(--destructive)",
          "--error-border": "transparent",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster, toast };
