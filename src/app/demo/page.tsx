import type { Metadata } from "next";

/*
 * /demo — the design lab.
 *
 * NOT a product surface. It exists to prototype and agree on the visual system
 * (color, type, tone, components, widgets, motion) before any of it reaches
 * `/` or `/app/*`. It is therefore deliberately OUTSIDE both the `(marketing)`
 * group (D6: marketing is the one copy of the marketing content) and `/app/*`
 * (D23: the (main)-group boundary is the auth gate line) — placing it in either
 * would make it either marketing content or a gated platform page, and it is
 * neither.
 *
 * Consequences of "not a product surface":
 *  - `noindex` — it must never appear in search results (same treatment as the
 *    placeholder legal pages).
 *  - Copy here is scaffolding, not product copy, so it is not i18n-keyed. If a
 *    pattern proven here becomes real UI, it is rebuilt inside the owning slice
 *    under the normal rules — nothing is promoted by moving the file.
 *
 * The ASK Design Locks are deliberately SUSPENDED on this surface to allow
 * experimentation. A first round (owner directive 2026-07-23: run
 * glassmorphism/neumorphism at maximum potential) produced two candidate
 * skins, `glass.css` and `neu.css`; both were judged and retired 2026-07-27,
 * along with the skin switcher, in favor of a faithful port of ONE reference
 * repo (owner directive): every token, shadow formula, radius, easing curve
 * and keyframe animation is pulled from neumorui's own source
 * (github.com/rukonpro/neumorui — packages/core/src/tokens/* and each
 * component's inline style objects), recoloured from the library's default
 * violet accent to orange. It lives in `./neumor.css`. That is contained, not
 * a system change: `design-system/tokens_old.css` (D3, the single visual source)
 * stays untouched throughout, and the locks still bind on every surface that
 * ships. If this direction is adopted for the real product, it is rebuilt
 * inside the owning slice under the full locks — nothing is promoted by
 * living in `/demo`.
 */

import { DemoLab } from "./DemoLab";

export const metadata: Metadata = {
  title: "Demo",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return (
    <main>
      <DemoLab />
    </main>
  );
}
