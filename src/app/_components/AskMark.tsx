import type { SVGProps } from "react";

/**
 * The ASK brand mark, inlined so it inherits `currentColor` and stays crisp at
 * any size. Same artwork as the favicon (src/app/icon.svg) — one mark, two
 * references, so the browser tab and the in-app chrome show the identical shape.
 *
 * Colour-agnostic: it fills from `currentColor`, so the caller sets it. The nav
 * renders it in the brand ACCENT (owner decision 2026-07-18) via `text-accent` —
 * a logo is brand identity, the one sanctioned accent use beyond an action; the
 * accent token carries its own light/dark values, so the mark stays the brand
 * orange in both themes with no `dark:` (P9.2). Decorative here: the adjacent
 * home link carries the accessible name, so the SVG is aria-hidden.
 */
export function AskMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 600 600"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <circle
        cx="275"
        cy="275"
        r="223.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="102.5"
      />
      <circle cx="275" cy="275" r="67.5" fill="currentColor" />
      <circle cx="537" cy="537" r="63" fill="currentColor" />
    </svg>
  );
}
