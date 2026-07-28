"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog as SheetPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";
import { useSkinPortalContainer } from "@/shared/ui/skin-portal";

/*
 * The Sheet primitive — a side-sliding panel, on ORANGE NEUMORPHISM (D25).
 * Built on the SAME Radix Dialog underneath `dialog.tsx` (a sheet is a modal
 * that enters from a screen edge, not a different a11y pattern), restyled
 * for that shape rather than scaffolded as a second component from the CLI.
 *
 * - Portal lands INSIDE `.neu-skin`, same fix and reason as `dialog.tsx`:
 *   outside it, `.neu-*` classes match nothing and colour utilities resolve
 *   to the marketing palette.
 * - The slide + fade is a plain CSS transition keyed off Radix's own
 *   `data-state` — the SAME exception `dialog.tsx`'s overlay fade already
 *   uses (chrome entrance/exit, not a content interaction), extended here to
 *   the panel itself. Radix's Presence waits for the transition before
 *   unmounting, so open AND close both animate with no extra library.
 *   `transform`/`opacity` only (D11 motion lock).
 */
function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  const container = useSkinPortalContainer();
  return (
    <SheetPrimitive.Portal
      data-slot="sheet-portal"
      container={container}
      {...props}
    />
  );
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn("neu-scrim fixed inset-0 z-50", className)}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "left" | "right";
}) {
  const t = useTranslations("common");

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "neu-sheet fixed inset-y-0 z-50 flex w-[85%] max-w-xs flex-col gap-1 overflow-y-auto p-5 outline-none",
          "transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
          side === "right"
            ? "right-0 data-[state=closed]:translate-x-full data-[state=open]:translate-x-0"
            : "left-0 data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0",
          className,
        )}
        {...props}
      >
        {children}
        {/* size-11 = the 44px touch floor (platform-ui-design §7). */}
        <SheetPrimitive.Close
          data-slot="sheet-close"
          className="absolute top-2 right-2 inline-flex size-11 items-center justify-center rounded-full opacity-70 focus-ring transition hover:opacity-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
        >
          <XIcon />
          <span className="sr-only">{t("close")}</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 pr-8", className)}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-base leading-snug font-semibold", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-foreground-muted", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
