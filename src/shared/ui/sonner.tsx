"use client";

import { Toaster as Sonner, toast, type ToasterProps } from "sonner";

/*
 * The Toast primitive, on sonner (the sanctioned toast; §7 single
 * implementation). NOT the shadcn scaffold: that wrapper reads the theme from
 * `next-themes`, a theme-management library ASK deliberately does not use — our
 * light/dark is pure CSS `prefers-color-scheme` on the tokens, with no provider
 * and no toggle (the vision has no such control, P9.1). So this wrapper is our
 * own: `theme="system"` makes sonner follow the same OS preference as the rest
 * of the product, and every surface colour is bound to a design-system token
 * via sonner's CSS variables (P9.2) — no raw values, no shadcn defaults.
 *
 * Toasts are FEEDBACK only (a saved change, a failed request). They are never a
 * trust signal and never carry an offer — those live on the card as tint, not
 * as transient chrome.
 */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="system"
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
