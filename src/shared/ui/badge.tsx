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
 *  - `offer` is the Unique-Offer chip (−30%, −5000 ₸): a low-chroma warm TINT
 *    with ink text and tabular numerals. It is information, so it never takes
 *    the accent fill — saturation stays reserved for things you can act on.
 *
 * `default` (accent) exists for the rare true call-to-attention only; almost
 * every badge in the product is `metadata` or `offer`.
 */
const badgeVariants = cva(
  "neu-chip focus-ring w-fit overflow-hidden whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        metadata: "tabular-nums",
        offer: "neu-chip-offer",
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
