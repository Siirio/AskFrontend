import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/*
 * The Badge primitive, on ORANGE NEUMORPHISM (D25).
 *
 * The product rules it encodes are unchanged by the reskin — they are about
 * meaning, not surface:
 *
 *  - NEVER a pill. `.neu-chip` is a 10px rectangle; a fully rounded badge is
 *    marketplace sticker language, and ASK badges are rectangular metadata.
 *  - `metadata` is the trust signal (freshness, response speed): a plain fact,
 *    now CARVED IN rather than bordered — the inset shadow is how this skin
 *    says "quiet, part of the surface". There is deliberately still NO
 *    green/amber/red variant; a coloured status light is a rating by another
 *    name, and this product has no ratings.
 *
 * `default` (accent) exists for the rare true call-to-attention only; almost
 * every badge in the product is `metadata`. (The Unique-Offer chip is NOT a
 * Badge variant — `search/ui/ResultCard.tsx` renders it directly off the
 * `--offer`/`--offer-foreground` tokens, since that is slice-owned business
 * meaning `shared/ui` must not name, per architecture §5's litmus test.)
 */
const badgeVariants = cva(
  "neu-chip focus-ring w-fit overflow-hidden whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        metadata: "tabular-nums",
        // No hairline to outline with on this skin — an "outline" badge is the
        // plain carved chip, one ink step darker so it still reads as distinct.
        outline: "text-foreground",
        default: "bg-accent text-accent-foreground shadow-none",
        destructive: "bg-destructive text-destructive-foreground shadow-none",
      },
    },
    defaultVariants: {
      variant: "metadata",
    },
  },
);

function Badge({
  className,
  variant = "metadata",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
