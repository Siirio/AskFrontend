import type { ReactNode } from "react";

import { RequireDashboardAccess } from "@/auth";

/**
 * Gate for the business cabinet (/app/business, owner rule 1): only a
 * business/staff session may open the Dashboard. Nested inside the `(main)`
 * layout's RequireAuth, so a logged-out visitor is already handled — this layer
 * only adds the role check, sending a customer-only session back to /app.
 *
 * WHY THE `(cabinet)` GROUP EXISTS (2026-07-27). This guard used to sit at
 * `business/layout.tsx` and therefore covered EVERY /app/business/* route. That
 * was right while the cabinet was the only thing under the prefix, and became
 * wrong the moment seller REGISTRATION arrived: a customer must be able to reach
 * `/app/business/register` precisely BECAUSE they are not a seller yet, and this
 * guard would bounce them off the one page that would make them one.
 *
 * The rule did not change; its scope is now stated by placement, the same
 * grammar as the `(main)` group itself — **everything under `business/(cabinet)/`
 * is dashboard-gated, and `business/register/` is the single sibling outside it,
 * outside because it is the way IN.** A new cabinet tab belongs in this group and
 * is protected by being put here, with nothing to remember.
 *
 * Server component (D7): RequireDashboardAccess is the client island that reads
 * the live session; the route content passed as `children` stays server-rendered
 * (§2 provider note). When the business-cabinet slice lands (roadmap #6) it keeps
 * this guard — access control is the app composition root's to place (R3).
 */
export default function BusinessCabinetLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <RequireDashboardAccess>{children}</RequireDashboardAccess>;
}
