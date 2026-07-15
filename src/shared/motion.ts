import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * The ONE JS animation system (D11, architecture §7).
 *
 * IMPORT GSAP FROM HERE, NEVER FROM "gsap" DIRECTLY. This module is the door:
 * importing through it is what guarantees the plugins are registered and the
 * design-system motion tokens are applied as GSAP's defaults. A component that
 * imports "gsap" straight is a second animation system with different defaults
 * — exactly the drift P6.1 exists to prevent.
 *
 * THE VALUES LIVE IN ONE PLACE. Durations and easings are read from the CSS
 * custom properties in `design-system/tokens.css` — the same values CSS
 * transitions use. Nothing is duplicated here, so the two engines cannot drift
 * (P6.2). If a token is missing, we simply do not override GSAP's own default
 * rather than hardcoding a fallback, which would be that duplicate.
 *
 * ANIMATE TRANSFORM AND OPACITY ONLY — never width/height/top/left. Those force
 * the browser to recalculate layout on every frame, which is what makes motion
 * janky. Use GSAP's transform aliases (`x`, `y`, `scale`, `rotation`) and
 * `autoAlpha` instead of `opacity`. This is a project LOCK, not a preference.
 */

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const FULL_MOTION = "(prefers-reduced-motion: no-preference)";

/** cubic-bezier(x1, y1, x2, y2) -> the CustomEase path for the identical curve. */
function cssEaseToCustomEase(name: string, cssValue: string): string | null {
  const points = cssValue.match(/-?[\d.]+/g);
  if (!points || points.length !== 4) return null;
  const [x1, y1, x2, y2] = points;
  CustomEase.create(name, `M0,0 C${x1},${y1} ${x2},${y2} 1,1`);
  return name;
}

let ready = false;

/**
 * Register the plugins and adopt the design-system motion tokens as GSAP's
 * defaults. Idempotent, and a no-op on the server — GSAP must never run during
 * SSR (D7: route files server-render).
 */
export function initMotion(): void {
  if (ready || typeof window === "undefined") return;
  ready = true;

  gsap.registerPlugin(useGSAP, ScrollTrigger, CustomEase);

  const tokens = getComputedStyle(document.documentElement);
  const seconds = (token: string): number | null => {
    const ms = Number.parseFloat(tokens.getPropertyValue(token));
    return Number.isFinite(ms) ? ms / 1000 : null;
  };

  const duration = seconds("--duration-base");
  const ease = cssEaseToCustomEase(
    "ask-out",
    tokens.getPropertyValue("--ease-out"),
  );

  gsap.defaults({
    ...(duration !== null && { duration }),
    ...(ease !== null && { ease }),
  });

  // The mobile URL bar showing/hiding is a viewport resize. Without this every
  // scroll on a phone would refresh every trigger and the storytelling stutters.
  ScrollTrigger.config({ ignoreMobileResize: true });
}

/** The reduced-motion gate, answered HERE and only here (P6.1). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true; // no motion until we know otherwise
  return window.matchMedia(REDUCED_MOTION).matches;
}

/**
 * The single sanctioned way to build a GSAP animation.
 *
 * `build` runs ONLY when the user has not asked for reduced motion, so under
 * `reduce` nothing is created at all and the page simply renders at its final
 * state — it does not animate quickly, it does not animate. GSAP reverts
 * everything automatically if the preference changes mid-session.
 *
 *   const scope = useRef<HTMLDivElement>(null);
 *   useGSAP(() => {
 *     const mm = withMotion(() => {
 *       gsap.from(".card", { autoAlpha: 0, y: 24, stagger: 0.06 });
 *     }, scope.current);
 *     return () => mm.revert();
 *   }, { scope });
 */
export function withMotion(
  build: () => void,
  scope?: Element | null,
): gsap.MatchMedia {
  initMotion();
  const mm = gsap.matchMedia();
  mm.add(FULL_MOTION, build, scope ?? undefined);
  return mm;
}

export { gsap, useGSAP, ScrollTrigger };
