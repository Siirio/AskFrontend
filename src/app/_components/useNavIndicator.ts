"use client";

import { useRef } from "react";

import {
  gsap,
  prefersReducedMotion,
  useGSAP,
  withMotion,
} from "@/shared/motion";

/**
 * The travelling selection pill (`.neu-nav-indicator`) that sits beneath
 * whichever destination is current — in EITHER nav layout.
 *
 * Extracted from `NavigationMenu` 2026-08-01 (P1.1: that file was 523 lines).
 * This is one responsibility with four refs and no rendering of its own, which
 * is exactly the shape P1.1 says to pull out — "split by responsibility
 * (sub-components, extracted hooks)". The caller renders the `<ul>` and the
 * `<span>`; this owns only the motion.
 *
 * A FLIP-style tween driven through `shared/motion.ts` (D14): on every
 * active-link change it reads the OLD rect, instantly snaps the indicator's box
 * to the NEW one, then plays the visual difference back as `x` + `scaleX` ONLY
 * (the transform/opacity motion lock — never `width`/`left`, which would force a
 * layout recalculation every frame). It ends at scale 1, so no distortion is
 * left over once it settles.
 */
export function useNavIndicator(
  activeHref: string | undefined,
  isMobile: boolean,
) {
  const navListRef = useRef<HTMLUListElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const prevRectRef = useRef<{ x: number; width: number } | null>(null);
  const prevListRef = useRef<HTMLUListElement | null>(null);

  useGSAP(
    () => {
      const list = navListRef.current;
      const indicator = indicatorRef.current;
      const target = activeHref ? linkRefs.current.get(activeHref) : null;
      if (!list || !indicator || !target) return;

      // The top bar and the mobile bottom bar are two DIFFERENT `<ul>`s (only
      // one mounts at a time). Swapping between them on a breakpoint change
      // must SNAP, not slide across the screen — the "previous" rect belongs
      // to a container that no longer exists.
      const listSwapped = prevListRef.current !== list;
      prevListRef.current = list;

      const listRect = list.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const nextX = targetRect.left - listRect.left;
      const nextWidth = targetRect.width;
      const prev = listSwapped ? null : prevRectRef.current;
      prevRectRef.current = { x: nextX, width: nextWidth };

      if (!prev || prefersReducedMotion()) {
        gsap.set(indicator, { x: nextX, width: nextWidth, opacity: 1 });
        return;
      }

      // Invert: sit the (now-resized) indicator visually back where it WAS.
      gsap.set(indicator, {
        x: prev.x,
        width: nextWidth,
        scaleX: prev.width / nextWidth,
        transformOrigin: "left center",
        opacity: 1,
      });
      const mm = withMotion(() => {
        gsap.to(indicator, {
          x: nextX,
          scaleX: 1,
          duration: 0.35,
          ease: "ask-out",
        });
      });
      return () => mm.revert();
    },
    { dependencies: [activeHref, isMobile], scope: navListRef },
  );

  /** Callback ref for each destination link — the map the effect measures. */
  const registerLink = (href: string) => (el: HTMLAnchorElement | null) => {
    if (el) linkRefs.current.set(href, el);
    else linkRefs.current.delete(href);
  };

  return { navListRef, indicatorRef, registerLink };
}
