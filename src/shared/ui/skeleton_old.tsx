/*
 * ARCHIVED — the pre-neumorphism skin, kept verbatim (owner directive
 * 2026-07-27). Nothing live imports it; its collaborators are the other *_old
 * files, so the set reads as a consistent whole. A SNAPSHOT, not a
 * component: do not edit it, and do not fix it up when the live file changes.
 * The live skin is design-system/neumorphism.css + the un-suffixed sibling.
 */

import * as React from "react";

import { cn } from "@/lib/utils";

/*
 * shadcn scaffold restyled to tokens (D12). The pulse is a Tailwind built-in
 * keyframe on opacity — it does not touch layout, so it is exempt from the
 * transform/opacity animation lock and needs no GSAP. `bg-surface-sunken` (not
 * shadcn's `bg-accent`, which here would be orange) is the correct quiet base.
 * The pulse still halts under prefers-reduced-motion via the global gate.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-sm bg-surface-sunken", className)}
      {...props}
    />
  );
}

export { Skeleton };
