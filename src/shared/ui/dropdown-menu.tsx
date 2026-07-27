"use client";

import * as React from "react";
import { ChevronRightIcon } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/*
 * The DropdownMenu primitive, on ORANGE NEUMORPHISM (D25). Radix owns ALL
 * behavior (focus trap, roving tabindex, typeahead, positioning, ARIA); the
 * design system owns every visual value (P9.2).
 *
 * PORTALED — read the note in dialog.tsx before editing. Radix renders the
 * content into <body>, outside the platform layout's `.neu-skin` wrapper, so
 * both Content and SubContent carry `data-neu-portal`: it brings the surface,
 * the ink, the radius and the raised-lg shadow out with them. Custom properties
 * inherit, so the ROWS inside can keep using ordinary colour utilities
 * (`bg-surface-sunken`, `text-foreground-subtle`) and resolve correctly.
 *
 * The highlighted row stays `bg-surface-sunken` rather than becoming an inset
 * groove: rows are dense and adjacent, and a carved highlight on each one turns
 * a menu into corrugation. Depth is the panel's story here, not the row's.
 * It is still never the accent — shadcn ships `focus:bg-accent`, which would
 * paint the brand orange across a hovered menu; the accent marks actions, never
 * a hovered row.
 *
 * No CSS enter/exit animation: we ship no second motion system beside GSAP
 * (§7), and Radix positions the menu cleanly without a zoom.
 */

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  );
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  );
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        data-neu-portal=""
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-32 origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto p-1.5",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "neu-menu-item relative flex cursor-default items-center gap-2 px-2.5 py-2 text-sm outline-hidden transition-colors duration-(--duration-fast) ease-out select-none focus:bg-surface-sunken focus:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-surface-sunken data-inset:pl-8 data-[variant=destructive]:text-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 data-[variant=destructive]:[&_svg]:text-destructive [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-foreground-subtle",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-2 py-1.5 text-xs text-foreground-subtle data-inset:pl-8",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("neu-rule pointer-events-none mx-1 my-1.5", className)}
      {...props}
    />
  );
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "neu-menu-item flex cursor-default items-center gap-2 px-2.5 py-2 text-sm outline-hidden transition-colors duration-(--duration-fast) ease-out select-none focus:bg-surface-sunken focus:text-foreground data-highlighted:bg-surface-sunken data-inset:pl-8 data-[state=open]:bg-surface-sunken [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-foreground-subtle",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      data-neu-portal=""
      className={cn(
        "z-50 min-w-32 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden p-1.5",
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
