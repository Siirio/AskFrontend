import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * The EmptyState primitive, on ORANGE NEUMORPHISM (D25). Own code (no shadcn
 * equivalent).
 *
 * This is the most important state in the product: when a catalog search finds
 * nothing it must NOT dead-end — it offers a path (send a request to
 * businesses). So `action` is a first-class slot, not an afterthought. The
 * primitive stays domain-free: it takes an icon, strings, and a rendered
 * action; the "send a request" wiring belongs to the consuming slice, never
 * here (shared/ carries no business knowledge).
 *
 * The skin makes the hierarchy literal. The whole panel is CARVED IN
 * (`.neu-empty-root`) — a hollow in the page, which is what an empty result is
 * — while the icon disc sits RAISED inside it and the action, being the only
 * thing you can do, is the only saturated object on screen. Depth is doing the
 * work that a border and a grey fill used to do.
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "neu-empty-root flex flex-col items-center justify-center gap-3 px-8 py-12 text-center",
        className,
      )}
      {...props}
    >
      {Icon ? (
        <span className="neu-empty-icon mb-2 grid size-14 place-items-center">
          <Icon className="size-6" aria-hidden="true" />
        </span>
      ) : null}
      <p className="text-lg font-semibold text-balance text-foreground">
        {title}
      </p>
      {description ? (
        <p className="max-w-prose text-sm text-pretty text-foreground-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
