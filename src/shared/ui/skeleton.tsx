import * as React from "react";

import { cn } from "@/lib/utils";

/*
 * The Skeleton primitive, on ORANGE NEUMORPHISM (D25).
 *
 * The opacity pulse is replaced by `.neu-skel`, where the shimmer IS the
 * surface — a gradient moving through the shadow pair — rather than a pulse
 * applied on top of a flat fill. On a skin with no borders, a pulsing block
 * reads as a flicker; a travelling highlight reads as a surface catching light,
 * which is the same story the raised/inset shadows already tell.
 *
 * `background-position` and `box-shadow` touch no layout property, so the D11
 * animation lock holds and this still needs no GSAP. It halts under the global
 * prefers-reduced-motion gate in globals.css.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("neu-skel rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
