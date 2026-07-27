/*
 * ARCHIVED — the pre-neumorphism skin, kept verbatim (owner directive
 * 2026-07-27). Nothing live imports it; its collaborators are the other *_old
 * files, so the set reads as a consistent whole. A SNAPSHOT, not a
 * component: do not edit it, and do not fix it up when the live file changes.
 * The live skin is design-system/neumorphism.css + the un-suffixed sibling.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/*
 * Scaffolded by the shadcn CLI, then restyled to design-system tokens before
 * first use (D12). Radix supplies behavior (Slot/asChild); every visual value
 * is a token (P9.2). shadcn's own palette (bg-primary, hover:bg-accent as a
 * subtle grey) was removed — here `accent` is the brand ORANGE and is spent
 * ONLY on the primary action (the saturation-is-action lock). Quiet variants
 * hover to `surface-sunken`, never to the accent.
 */
const buttonVariants = cva(
  "focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-sm text-sm font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // The only saturated fill. The primary action, and nothing else.
        default:
          "bg-accent text-accent-foreground hover:bg-accent-hover active:bg-accent-active",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90",
        // The bordered quiet action — e.g. the card's "Написать" (chat) button.
        outline:
          "border border-border-strong bg-transparent text-foreground hover:bg-surface-sunken",
        // A quiet filled action; hover lifts it toward the page surface.
        secondary: "bg-surface-sunken text-foreground hover:bg-surface",
        ghost: "bg-transparent text-foreground hover:bg-surface-sunken",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        // 44px — the customer-path touch target (platform-ui-design §7).
        lg: "h-11 px-6 text-base has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
