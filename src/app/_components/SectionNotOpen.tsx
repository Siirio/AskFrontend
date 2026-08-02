import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/shared/ui/empty-state";

/**
 * The honest "this section is not open yet" page, for a route that EXISTS and
 * is reachable but whose slice has not landed.
 *
 * Why this exists (AUDIT_2 N4 / AUDIT_1 B1). `/app/business`, `/app/chats` and
 * `/app/profile` are all reachable today — Chats is a permanent nav
 * destination, Settings is one tap inside the account menu, and a seller lands
 * on the cabinet the moment registration completes. All three rendered a bare
 * `<main><h1>+<p>` inside a neumorphic product, which reads as an unfinished
 * BUILD rather than as a message. The copy said "under construction"; nothing
 * about the presentation did.
 *
 * The project lock "a reachable control must DO something" lists exactly three
 * honest options for a destination that is not ready: build it, say plainly it
 * is not open, or stop offering the control. This is the second one, given the
 * form P9.3 requires of a surface that exists with no content — the shared
 * `EmptyState` primitive, never an invented visual. Nothing here is new UI, so
 * P9.1 is not engaged: it is the mandatory empty state for a page the vision
 * already contains.
 *
 * Server component (D7): no interactivity, so the route files stay server
 * components too and no `'use client'` boundary is created for a static page.
 *
 * `title` is duplicated into an `sr-only` `<h1>` because `EmptyState` renders
 * its title as a `<p>` — the heading outline of the page must survive, and a
 * visible second copy would just be the same sentence twice.
 */
export function SectionNotOpen({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="sr-only">{title}</h1>
      <EmptyState icon={icon} title={title} description={description} />
    </main>
  );
}
