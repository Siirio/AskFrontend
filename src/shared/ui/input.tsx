import * as React from "react";

import { cn } from "@/lib/utils";

/*
 * The Input primitive, on ORANGE NEUMORPHISM (D25).
 *
 * A field is carved IN where a button stands OUT. That single opposition is
 * what makes the skin legible without a border anywhere, so the border and the
 * `shadow-xs` of the old scaffold are gone rather than restyled — an inset
 * field with a hairline reads as two competing edges.
 *
 * Shape, depth and the focus form live in `.neu-input`
 * (design-system/neumorphism.css). Focus is an accent GLOW hugging the field
 * rather than the product's offset ring: an offset outline around a
 * shadow-defined field reads as a detached rectangle. Same role and the same
 * colour source (--accent) — the offset ring stays correct for chrome, which
 * keeps the shared `focus-ring` utility. `aria-invalid` swaps the glow for a
 * destructive edge, styled in CSS so every field gets it without opting in.
 *
 * The 16px base size is load-bearing, not taste: iOS Safari zooms the viewport
 * on focus for anything smaller, which throws a phone user out of the form.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "neu-input",
        "selection:bg-accent selection:text-accent-foreground",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
