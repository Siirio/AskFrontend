import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * The EmptyState primitive. Own code (no shadcn equivalent), tokens only.
 *
 * This is the most important state in the product: when a catalog search finds
 * nothing it must NOT dead-end — it offers a path (send a request to
 * businesses). So `action` is a first-class slot, not an afterthought. The
 * primitive is domain-free: it takes an icon, strings, and a rendered action;
 * the "send a request" wiring belongs to the consuming slice, never here
 * (shared/ carries no business knowledge).
 *
 * The icon sits in a quiet sunken disc — deliberately NOT the accent. An empty
 * result is information, not an action; saturation is reserved for the action
 * the customer can take, which lives in `action`.
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
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      {Icon ? (
        <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-surface-sunken text-foreground-subtle">
          <Icon className="size-5" aria-hidden="true" />
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
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
