import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/*
 * shadcn scaffold restyled to tokens (D12), and re-shaped to ASK's rules:
 *
 *  - `rounded-xs` (4px), NEVER `rounded-full`. A pill is marketplace sticker
 *    language; ASK badges are rectangular metadata (design lock).
 *  - The `offer` variant is the Unique-Offer chip (−30%, −5000 ₸): a low-chroma
 *    warm TINT, its weight from tabular numerals — never the accent fill. This
 *    is the saturation-is-action / tint-is-information lock made concrete.
 *  - The `metadata` variant is the trust signal (freshness, response speed): a
 *    plain bordered fact. There is deliberately NO green/amber/red variant —
 *    a coloured status light would read as a rating, and ASK has no ratings.
 *
 * `default` (accent) exists for the rare true call-to-attention only; most
 * badges in the product are `metadata` or `offer`.
 */
const badgeVariants = cva(
  "focus-ring inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-xs border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        metadata:
          "border-border bg-surface-sunken text-foreground-subtle tabular-nums",
        offer:
          "border-offer-border bg-offer text-offer-foreground font-semibold tabular-nums",
        outline: "border-border-strong bg-transparent text-foreground",
        default: "border-transparent bg-accent text-accent-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
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
