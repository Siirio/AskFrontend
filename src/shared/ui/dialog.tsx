"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";
import { useSkinPortalContainer } from "@/shared/ui/skin-portal";

/*
 * The Modal primitive, on ORANGE NEUMORPHISM (D25) — the Product Card modal
 * (D10) and the role-choosing modal are built on it.
 *
 *  - THE PORTAL PROBLEM, and the one thing to understand before editing this
 *    file: Radix renders overlay and content into a portal at the end of
 *    <body>, OUTSIDE the `.neu-skin` wrapper the platform layout applies —
 *    where the skin's rules match nothing and its colour utilities resolve to
 *    the MARKETING palette. `DialogPortal` therefore passes a `container` from
 *    `useSkinPortalContainer` so the portal lands back INSIDE the skin. Any new
 *    portaled surface needs the same treatment; read shared/ui/skin-portal.
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
  // Portals INTO the platform skin, not <body> — see shared/ui/skin-portal.
  // Without this the dialog's own `.neu-*` classes match nothing and its colour
  // utilities resolve to the marketing palette.
  const container = useSkinPortalContainer();
  return (
    <DialogPrimitive.Portal
      data-slot="dialog-portal"
      container={container}
      {...props}
    />
  );
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
      className={cn("neu-scrim fixed inset-0 z-50", className)}
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
        // No border and no `bg-surface-raised`: a neumorphic modal is lifted by
        // its shadow, and a hairline on top of that reads as a second edge.
        className={cn(
          "neu-card fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 p-7 outline-none sm:max-w-lg",
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
