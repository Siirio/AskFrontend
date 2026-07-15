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
