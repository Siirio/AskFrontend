"use client";

/*
 * ARCHIVED — the pre-neumorphism skin, kept verbatim (owner directive
 * 2026-07-27). Nothing live imports it; its collaborators are the other *_old
 * files, so the set reads as a consistent whole. A SNAPSHOT, not a
 * component: do not edit it, and do not fix it up when the live file changes.
 * The live skin is design-system/neumorphism.css + the un-suffixed sibling.
 */

import type { ReactNode } from "react";

import { LanguageSwitcher } from "@/shared/ui/language-switcher_old";
import { ThemeToggle } from "@/shared/ui/theme-toggle_old";

/**
 * The chrome shared by the Login and Register pages — a card centred in the
 * viewport holding one column: the ASK wordmark, the heading, the language +
 * theme controls, the form, and the cross-link to the other page. Auth pages
 * render standalone (no app nav).
 *
 * MOBILE-FIRST: the base classes target the smallest screen (tighter padding, a
 * smaller wordmark and heading) and `sm:` scales up from there — never the other
 * way round. Two things the layout must never lose:
 *  - the outer wrapper keeps `px-4` at EVERY width, so the card can never touch
 *    the screen edge once the viewport drops under `max-w-md`;
 *  - `min-h-svh` (small viewport height) centres the card vertically without the
 *    mobile URL-bar jump that `100vh` causes. It is min-, not fixed, height: a
 *    tall form (register) grows the wrapper instead of overflowing off-screen.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <main className="flex w-full max-w-md flex-col items-center gap-5 rounded-sm border border-border bg-surface-raised px-4 py-8 text-foreground shadow-lg sm:gap-6 sm:px-8 sm:py-10">
        {/* The ASK wordmark is an SVG, not a raster image, so a plain <img> is
            correct here — the next/image rule (D2) targets raster perf/SEO. */}
        <img
          src="/logo_horizontal.svg"
          alt="ASK"
          className="h-10 w-auto sm:h-12"
        />

        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
            {title}
          </h1>
          <p className="text-sm text-foreground-muted">{subtitle}</p>
        </div>

        {/* Wraps rather than overflows on the narrowest screens. */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        {/* The outer card carries the surface, border and padding — the form
            needs only full width, so no Card wrapper here (P7.4). */}
        <div className="w-full">{children}</div>

        <p className="text-center text-sm text-foreground-muted">{footer}</p>
      </main>
    </div>
  );
}
