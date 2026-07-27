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
 * shadcn scaffold restyled to tokens (D12). The focus signature is the shared
 * `focus-ring-field` utility (border takes the ring colour + a soft halo — the
 * field form of the signature); invalid state shows the destructive border.
 * Selection uses the accent — a deliberate, momentary use of the brand colour
 * on the text the user is actively acting on.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // The focus halo (box-shadow) and border ease over --duration-base
        // with the house ease-out curve — the transition list must name
        // box-shadow or the halo pops instead of blooming.
        "focus-ring-field h-9 w-full min-w-0 rounded-sm border border-border-strong bg-surface-raised px-3 py-1 text-base text-foreground shadow-xs transition-[color,border-color,box-shadow] duration-(--duration-base) ease-out",
        "selection:bg-accent selection:text-accent-foreground placeholder:text-foreground-subtle",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
