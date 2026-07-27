"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/*
 * The Modal primitive, on ORANGE NEUMORPHISM (D25) — the Product Card modal
 * (D10) and the role-choosing modal are built on it.
 *
 *  - THE PORTAL PROBLEM, and the one thing to understand before editing this
 *    file: Radix renders both the overlay and the content into a portal at the
 *    end of <body>, which is OUTSIDE the `.neu-skin` wrapper the platform
 *    layout applies. Neither the skin's rules nor its CSS variables reach them,
 *    so a colour utility here silently resolves to the MARKETING palette. Both
 *    nodes therefore carry `data-neu-portal` / `data-neu-portal-overlay`, the
 *    opt-in hook defined at the bottom of design-system/neumorphism.css. Any
 *    new portaled surface needs the same attribute.
 *  - Depth replaces borders: the content is lifted by `--neu-raised-lg`, so the
 *    hairline border and `bg-surface-raised` are gone — together they read as a
 *    second edge on top of the shadow.
 *  - No CSS enter/exit animation on the CONTENT: we ship one motion system
 *    (GSAP, D11) and no companion animation lib, and Radix mounts correctly
 *    without one. The overlay's 0.2s fade is the single exception, inherited
 *    from the /demo port — it is a scrim, not a moving element, and it halts
 *    under the global prefers-reduced-motion gate.
 *  - The close button is a real `focus-ring` target; DialogTitle is required by
 *    Radix for a11y and callers must provide one.
 */
function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      // data-neu-portal-overlay: Radix portals this to <body>, OUTSIDE the
      // `.neu-skin` wrapper, so it can reach neither the skin's rules nor its
      // variables. The attribute is how a portaled surface opts into the skin
      // (design-system/neumorphism.css) — it carries the scrim colour and the
      // blur. Do not swap it for `bg-overlay`: that token resolves to the
      // MARKETING palette out here.
      data-neu-portal-overlay=""
      className={cn("fixed inset-0 z-50", className)}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  const t = useTranslations("common");

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        // Same portal story as the overlay above: `data-neu-portal` carries the
        // surface, the ink and the raised-lg shadow out to <body>. The border
        // and `bg-surface-raised` are gone — a neumorphic modal is lifted by
        // its shadow, and a hairline on top of that reads as a second edge.
        data-neu-portal=""
        className={cn(
          "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 p-7 outline-none sm:max-w-lg",
          className,
        )}
        {...props}
      >
        {children}
        {/* size-11 = the 44px touch floor (platform-ui-design §7); the icon
            stays 16px and the button sits so the icon lands where top-4/right-4
            used to put it. Label from the `common` namespace — shared/ui chrome
            is never hardcoded copy (§7 i18n). */}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-1 right-1 inline-flex size-11 items-center justify-center rounded-full opacity-70 focus-ring transition hover:opacity-100 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">{t("close")}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-snug font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-foreground-muted", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
