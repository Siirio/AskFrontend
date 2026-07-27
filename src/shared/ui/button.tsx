import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/*
 * The Button primitive, on ORANGE NEUMORPHISM (D25).
 *
 * Shape, depth and motion come from `.neu-btn*` in design-system/neumorphism.css
 * — padding, radius, the raised→flip→inset shadow arc and the press squish are
 * baked there because they are per-component VALUES, and values live in the
 * design system (P9.2). What stays here is behaviour (Slot/asChild, disabled)
 * and the variant/size vocabulary. The class list is deliberately thin: if you
 * find yourself adding a shadow or radius utility to a Button, the design
 * system is missing a variant.
 *
 * `default` is the ONE saturated fill in the product and marks only the primary
 * action. It uses the flat `--accent` (the gradient's dark stop), never the
 * gradient itself: the gradient's light stop cannot hold a white label at AA —
 * measured 2.86:1. The gradient survives on fills that carry no text (avatar,
 * switch track, slider) via `.neu-fill-accent`.
 *
 * `outline` and `secondary` from the old scaffold are GONE — neumorphism has no
 * bordered or tinted quiet button, it has a raised one. Both now resolve to the
 * plain raised `.neu-btn`, so existing callers keep working and read correctly.
 *
 * A plain utility beside a `.neu-*` class OVERRIDES it, with no `!important`
 * needed: the `.neu-*` rules sit in `@layer components` and Tailwind utilities
 * in the later `utilities` layer, and layer order beats specificity. That is
 * why `size-7` alone is enough to resize `.neu-btn-icon` below.
 */
const buttonVariants = cva("neu-btn focus-ring", {
  variants: {
    variant: {
      default: "neu-btn-primary",
      destructive: "neu-btn-destructive",
      // The quiet action: raised, unsaturated. A neumorphic surface has no
      // hairline to outline with, so these three collapse to the base shape.
      outline: "",
      secondary: "",
      // No resting shadow — for a tertiary action that must not compete with
      // the two shadowed levels above it.
      ghost: "neu-btn-ghost",
      link: "neu-btn-ghost px-0 shadow-none text-accent underline-offset-4 hover:underline",
    },
    size: {
      default: "",
      xs: "neu-btn-sm px-2 py-1 text-xs",
      sm: "neu-btn-sm",
      // 44px — the customer-path touch floor (platform-ui-design §7).
      lg: "neu-btn-lg",
      icon: "neu-btn-icon",
      "icon-xs": "neu-btn-sm neu-btn-icon size-7",
      "icon-sm": "neu-btn-sm neu-btn-icon size-9",
      "icon-lg": "neu-btn-icon",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

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
      className={cn(
        buttonVariants({ variant, size }),
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export { Button, buttonVariants };
